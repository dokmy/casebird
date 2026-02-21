"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { OrdinanceViewer } from "@/components/cap/OrdinanceViewer";
import { LegislationText } from "@/components/cap/LegislationText";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AnimatedBird } from "@/components/ui/animated-bird";
import { useCaseViewer } from "@/components/cap/CaseViewerContext";
import ordinanceData from "@/data/cap57-structure.json";
import { Message, ThinkingStep, Stage, ResearchMode } from "@/types/chat";

interface Section {
  id: string;
  title: string;
  subpath: string;
  textEn?: string;
  textZh?: string;
  titleZh?: string;
}

interface Part {
  id: string;
  title: string;
  titleZh?: string;
  sections: Section[];
}

export default function Cap57Page() {
  const [selectedSection, setSelectedSection] = useState<{
    section: Section;
    part: Part;
  } | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [sectionTextCollapsed, setSectionTextCollapsed] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openCase } = useCaseViewer();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedSection) {
      setJustSelected(true);
      const timer = setTimeout(() => setJustSelected(false), 500);
      return () => clearTimeout(timer);
    }
  }, [selectedSection]);

  const handleSectionClick = (section: Section, part: Part) => {
    setSelectedSection({ section, part });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setChatInput("");

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
      let contextMessage = chatInput;
      if (selectedSection) {
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

        contextMessage = `[User is viewing Cap. 57, ${selectedSection.section.id}: ${selectedSection.section.title}]

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
          outputLanguage: "EN",
          userRole: "lawyer",
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
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-serif font-medium text-foreground hover:text-primary transition-colors"
          >
            <FeatherIcon className="w-5 h-5" />
            Casebird
          </Link>
          <div className="text-sm font-serif text-muted-foreground">
            Cap. 57 — Employment Ordinance (僱傭條例)
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-border">
          <OrdinanceViewer data={ordinanceData} onSectionClick={handleSectionClick} language={language} />
        </div>

        <div className="w-1/2 flex flex-col">
          {selectedSection && (
            <div className="border-b border-border overflow-hidden relative">
              <button
                onClick={() => setSectionTextCollapsed(!sectionTextCollapsed)}
                className={`w-full px-6 py-4 bg-muted/30 border-b border-border hover:bg-muted/40 transition-all duration-500 text-left flex items-center justify-between ${
                  justSelected ? "bg-primary/20 shadow-lg" : ""
                }`}
              >
                <div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {selectedSection.section.id} · {selectedSection.part.title}
                  </div>
                  <div className="text-lg font-serif font-semibold text-foreground mt-1">
                    {selectedSection.section.title}
                  </div>
                </div>
                <div className="text-muted-foreground text-sm">
                  {sectionTextCollapsed ? "▼ Show Text" : ""}
                </div>
              </button>

              {!sectionTextCollapsed && (
                <div className="overflow-y-auto max-h-[40vh] px-6 py-4 pb-16">
                  <LegislationText
                    textEn={selectedSection.section.textEn}
                    textZh={selectedSection.section.textZh}
                    language={language}
                    onLanguageChange={setLanguage}
                  />

                  <button
                    onClick={() => setSectionTextCollapsed(true)}
                    className="absolute bottom-4 right-4 px-4 py-2 bg-background border-2 border-border rounded-full shadow-lg hover:bg-muted hover:shadow-xl transition-all flex items-center gap-2 text-sm font-serif text-foreground"
                  >
                    <span>▲ Hide Text</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <FeatherIcon className="w-12 h-12 mx-auto mb-3" />
                  <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                    Employment Ordinance
                  </h2>
                  <p className="text-sm font-serif text-muted-foreground">
                    Select a section on the left, or ask a question about Cap. 57
                  </p>
                </div>

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
                      <button
                        onClick={() => setChatInput("What are the requirements for statutory severance payment?")}
                        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                      >
                        <div className="text-sm font-serif text-foreground">
                          What are the requirements for statutory severance payment?
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setChatInput("Explain the concept of unreasonable dismissal under Section 9")
                        }
                        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                      >
                        <div className="text-sm font-serif text-foreground">
                          Explain the concept of unreasonable dismissal under Section 9
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setChatInput("What constitutes a continuous contract under Cap. 57?")
                        }
                        className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors"
                      >
                        <div className="text-sm font-serif text-foreground">
                          What constitutes a continuous contract under Cap. 57?
                        </div>
                      </button>
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
                    : "Ask about Cap. 57..."
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
          </div>
        </div>
      </div>
    </div>
  );
}
