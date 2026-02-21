"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { OrdinanceViewer } from "@/components/cap/OrdinanceViewer";
import { LegislationText } from "@/components/cap/LegislationText";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AnimatedBird } from "@/components/ui/animated-bird";
import { useCaseViewer } from "@/components/cap/CaseViewerContext";
import { SignupPromptModal } from "@/components/auth/SignupPromptModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { UpgradeModal } from "@/components/chat/UpgradeModal";
import { Message, ThinkingStep, Stage, ResearchMode, UserRole } from "@/types/chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  subpath: string;
  textEn?: string;
  textZh?: string;
}

interface Part {
  id: string;
  title: string;
  sections: Section[];
}

interface OrdinancePageClientProps {
  cap: string;
  title: string;
  titleZh: string;
  exampleQuestions: string[];
  ordinanceData: {
    cap: string;
    title: string;
    titleZh?: string;
    parts: Part[];
  };
}

export default function OrdinancePageClient({
  cap,
  title,
  titleZh,
  exampleQuestions,
  ordinanceData,
}: OrdinancePageClientProps) {
  const [selectedSection, setSelectedSection] = useState<{
    section: Section;
    part: Part;
  } | null>(null);
  const [showingSectionText, setShowingSectionText] = useState(false); // Track if showing section text on left
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [justSelected, setJustSelected] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<"EN" | "TC">("EN");
  const [userRole, setUserRole] = useState<UserRole>("lawyer");
  const [subscription, setSubscription] = useState<{
    plan: string;
    message_count: number;
    message_limit: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  // Create supabase client once to avoid infinite loops in useEffects
  const supabase = useRef(createClient()).current;
  const { openCase } = useCaseViewer();

  // Check auth status and load user data on mount
  useEffect(() => {
    console.log(`[AUTH] Cap ${cap} page: checkAuth useEffect triggered`);
    const checkAuth = async () => {
      console.log(`[AUTH] Cap ${cap} page: fetching user...`);
      const { data: { user } } = await supabase.auth.getUser();
      console.log(`[AUTH] Cap ${cap} page: user result:`, user ? `authenticated (${user.email})` : 'not authenticated');
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || "");
      setUserId(user?.id || null);

      if (user) {
        // Clear anonymous message count
        localStorage.removeItem('anonymous_message_count');

        // Load user settings and subscription in parallel
        const [settingsRes, subRes] = await Promise.all([
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

        if (settingsRes.data) {
          setOutputLanguage(settingsRes.data.output_language as "EN" | "TC");
          if (settingsRes.data.user_role) {
            setUserRole(settingsRes.data.user_role as UserRole);
          }
        }

        if (subRes.data) {
          setSubscription(subRes.data);
        }
      }
      console.log(`[AUTH] Cap ${cap} page: checkAuth complete`);
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH] Cap ${cap} page: onAuthStateChange triggered, event:`, event, 'session:', session ? 'present' : 'null');
      setIsAuthenticated(!!session?.user);
      setUserEmail(session?.user?.email || "");
      setUserId(session?.user?.id || null);

      // Clear anonymous message count on sign in
      if (session?.user) {
        console.log(`[AUTH] Cap ${cap} page: session user found, reloading settings`);
        localStorage.removeItem('anonymous_message_count');
        setShowAuthModal(false);
        setShowSignupPrompt(false);

        // Reload settings/subscription
        const [settingsRes, subRes] = await Promise.all([
          supabase
            .from("user_settings")
            .select("output_language, user_role")
            .eq("user_id", session.user.id)
            .single(),
          supabase
            .from("subscriptions")
            .select("plan, message_count, message_limit")
            .eq("user_id", session.user.id)
            .single(),
        ]);

        if (settingsRes.data) {
          setOutputLanguage(settingsRes.data.output_language as "EN" | "TC");
          if (settingsRes.data.user_role) {
            setUserRole(settingsRes.data.user_role as UserRole);
          }
        }

        if (subRes.data) {
          setSubscription(subRes.data);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty deps - supabase ref is stable, only run once on mount

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Flash animation when section changes
  useEffect(() => {
    if (selectedSection) {
      setJustSelected(true);
      const timer = setTimeout(() => setJustSelected(false), 500);
      return () => clearTimeout(timer);
    }
  }, [selectedSection]);

  const handleSectionClick = (section: Section, part: Part) => {
    setSelectedSection({ section, part });
    setShowingSectionText(true); // Show section text on left side
  };

  const handleBackToOrdinanceList = () => {
    setShowingSectionText(false); // Back to ordinance viewer on left
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSendingRef.current) return;

    // Check if user is anonymous and has already sent 1 message
    if (!isAuthenticated) {
      const anonymousCount = parseInt(localStorage.getItem('anonymous_message_count') || '0');

      if (anonymousCount >= 1) {
        // Show signup prompt instead of sending message
        setShowSignupPrompt(true);
        return;
      }
    }

    // For authenticated users: check/deduct message credits
    if (isAuthenticated && userId) {
      try {
        const { data: rpcResult, error } = await supabase.rpc("increment_message_count", { uid: userId });

        if (error) {
          console.error("RPC error:", error);
          alert("Failed to check message limit. Please try again.");
          return;
        }

        if (!rpcResult?.allowed) {
          setShowUpgradeModal(true);
          return;
        }

        // Update local subscription state
        if (rpcResult) {
          setSubscription({
            plan: rpcResult.plan,
            message_count: rpcResult.count,
            message_limit: rpcResult.limit,
          });
        }
      } catch (e) {
        console.error("Message count error:", e);
        alert("Failed to check message limit. Please try again.");
        return;
      }
    }

    isSendingRef.current = true;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setChatInput("");

    // Increment anonymous message count for non-authenticated users
    if (!isAuthenticated) {
      const currentCount = parseInt(localStorage.getItem('anonymous_message_count') || '0');
      localStorage.setItem('anonymous_message_count', (currentCount + 1).toString());
    }

    // Create or update conversation in database (authenticated users only)
    let currentConversationId = conversationId;
    if (isAuthenticated && userId && !currentConversationId) {
      try {
        const conversationTitle = selectedSection
          ? `Cap. ${cap}, ${selectedSection.section.id}: ${selectedSection.section.title}`
          : `Cap. ${cap} — ${title}`;

        const { data: newConv, error: convError } = await supabase
          .from("cap_conversations")
          .insert({
            user_id: userId,
            cap: cap,
            section: selectedSection?.section.id || null,
            title: conversationTitle,
          })
          .select()
          .single();

        if (convError) {
          console.error("Failed to create conversation:", convError);
        } else if (newConv) {
          currentConversationId = newConv.id;
          setConversationId(newConv.id);
        }
      } catch (e) {
        console.error("Conversation creation error:", e);
      }
    }

    // Save user message to database
    if (isAuthenticated && currentConversationId) {
      try {
        await supabase.from("cap_messages").insert({
          conversation_id: currentConversationId,
          role: "user",
          content: chatInput,
        });
      } catch (e) {
        console.error("Failed to save user message:", e);
      }
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

    try {
      // Build context message about selected section
      let contextMessage = chatInput;
      if (selectedSection) {
        // Strip HTML tags from section text
        const stripHtml = (html: string) => {
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          return tmp.textContent || tmp.innerText || "";
        };

        const sectionText = language === "zh" && selectedSection.section.textZh
          ? stripHtml(selectedSection.section.textZh)
          : selectedSection.section.textEn
          ? stripHtml(selectedSection.section.textEn)
          : "";

        contextMessage = `[User is viewing Cap. ${cap}, ${selectedSection.section.id}: ${selectedSection.section.title}]

The full text of this section is:
${sectionText}

User's question: ${chatInput}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextMessage,
          mode: "fast" as ResearchMode,
          outputLanguage: outputLanguage,
          userRole: userRole,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(line.slice(6));

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
                    return {
                      ...m,
                      content: m.content + event.data,
                      currentStage: undefined,
                    };
                  case "done": {
                    const data = event.data as { iterations?: number };
                    setLoadingFollowUps(true);
                    return {
                      ...m,
                      iterations: data.iterations || 1,
                      currentStage: undefined,
                    };
                  }
                  case "case_urls": {
                    const urls = event.data as Record<string, string>;
                    return { ...m, caseUrls: { ...(m.caseUrls || {}), ...urls } };
                  }
                  case "follow_up_questions": {
                    const questions = event.data as string[];
                    setLoadingFollowUps(false);
                    return { ...m, followUpQuestions: questions.length > 0 ? questions : undefined };
                  }
                  case "error":
                    setLoadingFollowUps(false);
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
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Sorry, an error occurred: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;

      // Save assistant message to database after response completes
      if (isAuthenticated && currentConversationId) {
        // Get the final assistant message from state
        setTimeout(async () => {
          setMessages((currentMessages) => {
            const assistantMsg = currentMessages.find((m) => m.id === assistantId);
            if (assistantMsg && assistantMsg.content) {
              // Save to database (async, don't wait)
              supabase.from("cap_messages").insert({
                conversation_id: currentConversationId,
                role: "assistant",
                content: assistantMsg.content,
                thinking_steps: assistantMsg.thinkingSteps || null,
                iterations: assistantMsg.iterations || null,
              }).then(({ error }) => {
                if (error) console.error("Failed to save assistant message:", error);
              });
            }
            return currentMessages;
          });
        }, 100);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignOut={handleSignOut}
        onSignIn={() => setShowAuthModal(true)}
        navigationLink={{ href: "/", label: "Chat" }}
      />

      {/* Split Screen Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Ordinance Viewer OR Section Text (50% width) */}
        <div className="w-1/2 border-r border-border flex flex-col">
          {showingSectionText && selectedSection ? (
            /* Show Section Text with Back Button */
            <>
              <div className="border-b border-border px-4 py-3 bg-muted/20">
                <button
                  onClick={handleBackToOrdinanceList}
                  className="flex items-center gap-2 text-sm font-serif text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>←</span>
                  <span>Back to sections</span>
                </button>
                <div className="mt-2">
                  <div className="text-xs font-mono text-muted-foreground">
                    {selectedSection.section.id} · {selectedSection.part.title}
                  </div>
                  <div className="text-base font-serif font-semibold text-foreground mt-1">
                    {selectedSection.section.title}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <LegislationText
                  textEn={selectedSection.section.textEn}
                  textZh={selectedSection.section.textZh}
                  language={language}
                  onLanguageChange={setLanguage}
                />
              </div>
            </>
          ) : (
            /* Show Ordinance Viewer */
            <OrdinanceViewer data={ordinanceData} onSectionClick={handleSectionClick} language={language} />
          )}
        </div>

        {/* Right: Chat Only (50% width) */}
        <div className="w-1/2 flex flex-col">

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <FeatherIcon className="w-12 h-12 mx-auto mb-3" />
                  <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                    {title}
                  </h2>
                  <p className="text-sm font-serif text-muted-foreground">
                    Select a section on the left, or ask a question about Cap. {cap}
                  </p>
                </div>

                {/* Example Questions */}
                <div className="space-y-2 w-full max-w-md">
                  {selectedSection ? (
                    <>
                      <button
                        onClick={() =>
                          setChatInput(
                            `Find relevant cases about ${selectedSection.section.id}: ${selectedSection.section.title}`
                          )
                        }
                        className={`w-full px-4 py-3 text-left bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-all duration-500 ${
                          justSelected ? "bg-primary/30 shadow-lg ring-2 ring-primary/50" : ""
                        }`}
                      >
                        <div className="text-sm font-serif text-foreground font-medium">
                          Find relevant cases about {selectedSection.section.id}:{" "}
                          {selectedSection.section.title}
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setChatInput(`Explain the key requirements of ${selectedSection.section.id}`)
                        }
                        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                      >
                        <div className="text-sm font-serif text-foreground">
                          Explain the key requirements of {selectedSection.section.id}
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setChatInput(`What are common defenses under ${selectedSection.section.id}?`)
                        }
                        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                      >
                        <div className="text-sm font-serif text-foreground">
                          What are common defenses under {selectedSection.section.id}?
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      {exampleQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setChatInput(question)}
                          className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                        >
                          <div className="text-sm font-serif text-foreground">
                            {question}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onCaseClick={openCase}
                    onQuestionClick={(question) => {
                      setChatInput(question);
                      setTimeout(() => {
                        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                        input?.focus();
                      }, 0);
                    }}
                  />
                ))}
                {loadingFollowUps && (
                  <div className="py-4 px-6">
                    <div className="flex items-center gap-3 text-sm font-serif text-muted-foreground">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="italic">Generating follow-up questions...</span>
                    </div>
                  </div>
                )}
                {isLoading && messages[messages.length - 1]?.content === "" && (
                  <div className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-6">
                        <AnimatedBird
                          stage={messages[messages.length - 1]?.currentStage?.stage || "idle"}
                        />
                      </div>
                      <div className="text-sm font-serif italic text-muted-foreground">
                        {messages[messages.length - 1]?.currentStage?.description ||
                          "Thinking..."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="px-6 py-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                placeholder={
                  selectedSection
                    ? `Ask about ${selectedSection.section.id}...`
                    : `Ask about Cap. ${cap}...`
                }
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-serif text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isLoading}
                className="px-6 py-2 bg-primary text-primary-foreground font-serif font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            {/* Message counter for authenticated users */}
            {isAuthenticated && subscription && (
              <div className="flex items-center justify-center mt-2">
                <p className={cn(
                  "text-xs font-serif",
                  subscription.message_count >= subscription.message_limit * 0.8 ? "text-orange-500" : "text-muted-foreground"
                )}>
                  {subscription.message_count}/{subscription.message_limit} messages used
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignupPrompt && (
        <SignupPromptModal
          onClose={() => setShowSignupPrompt(false)}
          onSignUp={() => {
            setShowSignupPrompt(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      )}

      {showUpgradeModal && subscription && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={subscription.plan}
          messageCount={subscription.message_count}
          messageLimit={subscription.message_limit}
        />
      )}
    </div>
  );
}
