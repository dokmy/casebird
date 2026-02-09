"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { CaseViewer } from "@/components/chat/CaseViewer";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { Sidebar, ConversationItem } from "@/components/chat/Sidebar";
import { AuthModal } from "@/components/auth/AuthModal";
import { UpgradeModal } from "@/components/chat/UpgradeModal";
import { AnimatedBird } from "@/components/ui/animated-bird";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { Message, SelectedCase, ThinkingStep, Stage, ResearchMode, CaseLanguage, UserRole } from "@/types/chat";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SelectedCase | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<"EN" | "TC">("EN");
  const [userRole, setUserRole] = useState<UserRole>("insurance");
  const [caseLanguage, setCaseLanguage] = useState<CaseLanguage>("any");
  const [subscription, setSubscription] = useState<{
    plan: string;
    message_count: number;
    message_limit: number;
  } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load user and conversations on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || "");
        setUserId(user.id);
        const [convResult, settingsResult, subResult] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, title, updated_at, case_language")
            .order("updated_at", { ascending: false }),
          supabase
            .from("user_settings")
            .select("output_language, user_role")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("subscriptions")
            .select("plan, message_count, message_limit")
            .eq("user_id", user.id)
            .single(),
        ]);
        if (convResult.data) setConversations(convResult.data);
        if (settingsResult.data) {
          setOutputLanguage(settingsResult.data.output_language as "EN" | "TC");
          if (settingsResult.data.user_role) {
            setUserRole(settingsResult.data.user_role as UserRole);
          }
        }
        if (subResult.data) {
          setSubscription(subResult.data);
        } else {
          // No subscription yet — will be auto-created on first message
          setSubscription({ plan: "free", message_count: 0, message_limit: 10 });
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoadingConversations(false);
    };
    init();
  }, [supabase]);

  // Load messages when switching conversations
  useEffect(() => {
    if (!activeConversationId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            thinkingSteps: m.thinking_steps || undefined,
            iterations: m.iterations || undefined,
          }))
        );
      }
    };
    loadMessages();
  }, [activeConversationId, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, mode: ResearchMode = "normal") => {
      // If not authenticated, show auth modal
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setChatInput("");

      // Create or reuse conversation
      let convId = activeConversationId;
      if (!convId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ title: "New conversation", mode, case_language: caseLanguage, user_id: userId })
          .select("id, title, updated_at, case_language")
          .single();
        if (error) console.error("Failed to create conversation:", error);
        if (data) {
          convId = data.id;
          setActiveConversationId(data.id);
          setConversations((prev) => [{ ...data, generatingTitle: true }, ...prev]);

          // Generate title in background
          fetch("/api/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content }),
          })
            .then((res) => res.json())
            .then(({ title }) => {
              const finalTitle = title || (content.length > 50 ? content.substring(0, 47) + "..." : content);
              supabase
                .from("conversations")
                .update({ title: finalTitle })
                .eq("id", data.id)
                .then(() => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === data.id ? { ...c, title: finalTitle, generatingTitle: false } : c
                    )
                  );
                });
            })
            .catch(() => {
              const fallback = content.length > 50 ? content.substring(0, 47) + "..." : content;
              supabase
                .from("conversations")
                .update({ title: fallback })
                .eq("id", data.id)
                .then(() => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === data.id ? { ...c, title: fallback, generatingTitle: false } : c
                    )
                  );
                });
            });
        }
      }

      // Save user message to DB
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "user",
          content,
        });
        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }

      // Create placeholder for assistant message
      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        thinkingSteps: [],
        iterations: 0,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Track final content for saving
      let finalAssistantContent = "";
      const finalThinkingSteps: ThinkingStep[] = [];
      let finalIterations = 0;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            mode,
            outputLanguage,
            userRole,
            caseLanguage: caseLanguage === "any" ? undefined : caseLanguage,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.error === "limit_reached") {
            setSubscription((prev) => prev ? { ...prev, message_count: errorData.count, message_limit: errorData.limit } : prev);
            setShowUpgradeModal(true);
            // Remove the optimistic user message
            setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
            setIsLoading(false);
            return;
          }
        }
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
        // Update local subscription count
        setSubscription((prev) => prev ? { ...prev, message_count: prev.message_count + 1 } : prev);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete events in buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const event = JSON.parse(line.slice(6));

              // Track content for DB save OUTSIDE the updater to avoid React strict mode double-invocation
              if (event.type === "text") {
                finalAssistantContent += event.data;
              } else if (event.type === "thinking") {
                const data = event.data as { type: string; content: string; iteration?: number };
                finalThinkingSteps.push({
                  type: data.type as ThinkingStep["type"],
                  content: data.content,
                  iteration: data.iteration,
                });
              } else if (event.type === "tool_call") {
                const data = event.data as { name: string; args: Record<string, unknown>; iteration?: number };
                finalThinkingSteps.push({
                  type: "tool_call",
                  content: `Calling ${data.name}`,
                  toolName: data.name,
                  toolArgs: data.args,
                  iteration: data.iteration,
                });
              } else if (event.type === "tool_result") {
                const data = event.data as { name: string; summary: string; iteration?: number };
                for (let i = finalThinkingSteps.length - 1; i >= 0; i--) {
                  if (finalThinkingSteps[i].type === "tool_call" && finalThinkingSteps[i].toolName === data.name && !finalThinkingSteps[i].toolSummary) {
                    finalThinkingSteps[i] = { ...finalThinkingSteps[i], toolSummary: data.summary };
                    break;
                  }
                }
              } else if (event.type === "done") {
                finalIterations = (event.data as { iterations?: number }).iterations || 1;
              }

              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;

                  switch (event.type) {
                    case "thinking": {
                      const data = event.data as {
                        type: string;
                        content: string;
                        iteration?: number;
                      };
                      const step: ThinkingStep = {
                        type: data.type as ThinkingStep["type"],
                        content: data.content,
                        iteration: data.iteration,
                      };
                      return {
                        ...m,
                        thinkingSteps: [...(m.thinkingSteps || []), step],
                      };
                    }
                    case "tool_call": {
                      const data = event.data as {
                        name: string;
                        args: Record<string, unknown>;
                        iteration?: number;
                      };
                      const step: ThinkingStep = {
                        type: "tool_call",
                        content: `Calling ${data.name}`,
                        toolName: data.name,
                        toolArgs: data.args,
                        iteration: data.iteration,
                      };
                      return {
                        ...m,
                        thinkingSteps: [...(m.thinkingSteps || []), step],
                      };
                    }
                    case "tool_result": {
                      const data = event.data as {
                        name: string;
                        summary: string;
                        iteration?: number;
                      };
                      const updatedSteps = [...(m.thinkingSteps || [])];
                      for (let i = updatedSteps.length - 1; i >= 0; i--) {
                        if (
                          updatedSteps[i].type === "tool_call" &&
                          updatedSteps[i].toolName === data.name &&
                          !updatedSteps[i].toolSummary
                        ) {
                          updatedSteps[i] = {
                            ...updatedSteps[i],
                            toolSummary: data.summary,
                          };
                          break;
                        }
                      }
                      return { ...m, thinkingSteps: updatedSteps };
                    }
                    case "stage": {
                      const data = event.data as Stage;
                      return { ...m, currentStage: data };
                    }
                    case "text":
                      return { ...m, content: m.content + event.data, currentStage: undefined };
                    case "done": {
                      const data = event.data as { iterations?: number };
                      return { ...m, iterations: data.iterations || 1, currentStage: undefined };
                    }
                    case "case_urls": {
                      const urls = event.data as Record<string, string>;
                      return { ...m, caseUrls: { ...(m.caseUrls || {}), ...urls } };
                    }
                    case "error":
                      return {
                        ...m,
                        content:
                          m.content +
                          `\n\n**Error:** ${(event.data as { message: string }).message}`,
                        currentStage: undefined,
                      };
                    default:
                      return m;
                  }
                })
              );
            } catch {
              // Skip malformed events
            }
          }
        }

        // Save assistant message to DB after streaming completes
        if (convId && finalAssistantContent) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: finalAssistantContent,
            thinking_steps: finalThinkingSteps,
            iterations: finalIterations,
          });
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Sorry, an error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, activeConversationId, userId, isAuthenticated, outputLanguage, userRole, caseLanguage, supabase]
  );

  const handleCaseClick = useCallback((url: string, citation: string) => {
    setSelectedCase({ url, citation });
  }, []);

  const handleExampleClick = useCallback(
    (query: string) => {
      setChatInput(query);
    },
    []
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setSelectedCase(null);
    setCaseLanguage("any");
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setSelectedCase(null);
    // Restore case language from conversation data
    const conv = conversations.find((c) => c.id === id);
    setCaseLanguage((conv?.case_language as CaseLanguage) || "any");
  }, [conversations]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("messages").delete().eq("conversation_id", id);
      await supabase.from("conversations").delete().eq("id", id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [activeConversationId, supabase]
  );

  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      await supabase.from("conversations").update({ title }).eq("id", id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    },
    [supabase]
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.reload();
  }, [supabase]);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <FeatherIcon className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  // Public (not logged in) layout
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        {/* Top bar with sign in */}
        <header className="relative z-10 px-6 py-3 shrink-0 flex items-center justify-end">
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-serif text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        </header>

        {/* Centered welcome + input */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-4 pb-4">
          <WelcomeScreen onExampleClick={handleExampleClick} outputLanguage={outputLanguage} userRole={userRole} />
          <div className="w-full max-w-2xl mx-auto mt-4">
            <ChatInput onSend={handleSend} isLoading={false} caseLanguage={caseLanguage} onCaseLanguageChange={setCaseLanguage} input={chatInput} onInputChange={setChatInput} />
          </div>
          <div className="pt-2 text-center">
            <p className="text-xs font-serif text-muted-foreground">
              <Link href="/terms" className="hover:underline">Terms of Use</Link>
              {" · "}
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  // Authenticated layout
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        userEmail={userEmail}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onSignOut={handleSignOut}
        loading={loadingConversations}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="border-b border-border/50 px-4 md:px-6 py-4 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-xl font-serif font-medium text-foreground tracking-tight hover:text-primary transition-colors group"
            >
              <span className="font-serif">Casebird</span>
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat Panel */}
          <div
            className={`flex flex-col ${selectedCase ? "md:w-1/2" : "w-full"} w-full transition-all duration-300`}
          >
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center overflow-y-auto px-4">
                <WelcomeScreen onExampleClick={handleExampleClick} outputLanguage={outputLanguage} userRole={userRole} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                <div className="pb-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onCaseClick={handleCaseClick}
                    />
                  ))}
                  {isLoading && messages[messages.length - 1]?.content === "" && (
                    <div className="py-8">
                      <div className="max-w-2xl mx-auto px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6">
                            <AnimatedBird
                              stage={messages[messages.length - 1]?.currentStage?.stage || "idle"}
                            />
                          </div>
                          <div className="text-sm font-serif italic text-muted-foreground">
                            {messages[messages.length - 1]?.currentStage?.description || "Thinking..."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ChatInput onSend={handleSend} isLoading={isLoading} caseLanguage={caseLanguage} onCaseLanguageChange={setCaseLanguage} caseLanguageLocked={messages.length > 0} messageCount={subscription?.message_count} messageLimit={subscription?.message_limit} input={chatInput} onInputChange={setChatInput} />
          </div>

          {/* Case Viewer Panel - desktop side panel */}
          {selectedCase && (
            <div className="hidden md:block w-1/2 transition-all duration-300">
              <CaseViewer
                url={selectedCase.url}
                citation={selectedCase.citation}
                onClose={() => setSelectedCase(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Case Viewer - mobile bottom sheet */}
      {selectedCase && (
        <div className="md:hidden">
          <CaseViewer
            url={selectedCase.url}
            citation={selectedCase.citation}
            onClose={() => setSelectedCase(null)}
            mobile
          />
        </div>
      )}

      {showUpgradeModal && subscription && (
        <UpgradeModal
          currentPlan={subscription.plan}
          messageCount={subscription.message_count}
          messageLimit={subscription.message_limit}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
