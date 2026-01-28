"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { CaseViewer } from "@/components/chat/CaseViewer";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { AnimatedBird } from "@/components/ui/animated-bird";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { Message, SelectedCase, ThinkingStep, Stage, ResearchMode } from "@/types/chat";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SelectedCase | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, mode: ResearchMode = "normal") => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

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
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            mode,
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

          // Process complete events in buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

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
                      // Update the matching tool_call step with the result
                      const updatedSteps = [...(m.thinkingSteps || [])];
                      // Find the last tool_call with this name that doesn't have a result
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
    [messages]
  );

  const handleCaseClick = useCallback((url: string, citation: string) => {
    setSelectedCase({ url, citation });
  }, []);

  const handleExampleClick = useCallback(
    (example: string, mode: ResearchMode) => {
      handleSend(example, mode);
    },
    [handleSend]
  );

  const handleHomeClick = useCallback(() => {
    setMessages([]);
    setSelectedCase(null);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - Minimal */}
      <header className="border-b border-border/50 px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-2 text-xl font-serif font-medium text-foreground tracking-tight hover:text-primary transition-colors group"
          >
            <FeatherIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Casebird
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Panel */}
        <div
          className={`flex flex-col ${selectedCase ? "w-1/2" : "w-full"} transition-all duration-300`}
        >
          {messages.length === 0 ? (
            <WelcomeScreen onExampleClick={handleExampleClick} />
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

          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>

        {/* Case Viewer Panel */}
        {selectedCase && (
          <div className="w-1/2 transition-all duration-300">
            <CaseViewer
              url={selectedCase.url}
              citation={selectedCase.citation}
              onClose={() => setSelectedCase(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
