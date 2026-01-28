"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronRight,
  Scale,
  Search,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Message, ThinkingStep } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  onCaseClick: (url: string, citation: string) => void;
}

export function ChatMessage({ message, onCaseClick }: ChatMessageProps) {
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === "user";

  const hasThinkingSteps =
    message.thinkingSteps && message.thinkingSteps.length > 0;

  // Group thinking steps by iteration
  const groupedSteps = groupStepsByIteration(message.thinkingSteps || []);

  return (
    <div className={cn("py-8", isUser ? "bg-transparent" : "")}>
      <div className="max-w-2xl mx-auto px-6">
        {/* User message - right aligned, sans-serif */}
        {isUser ? (
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-primary/5 rounded-2xl px-5 py-3 border border-primary/10">
              <p className="font-sans text-foreground leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ) : (
          /* AI message - serif throughout */
          <div className="font-serif">
            {/* Research Process Panel */}
            {hasThinkingSteps && (
              <div className="mb-8">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showThinking ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-serif italic">Research Process</span>
                  {message.iterations && message.iterations > 0 && (
                    <span className="text-primary font-serif">
                      — {message.iterations} round
                      {message.iterations > 1 ? "s" : ""}
                    </span>
                  )}
                </button>

                {showThinking && (
                  <div className="mt-4 space-y-4">
                    {Object.entries(groupedSteps).map(([iteration, steps]) => (
                      <IterationBlock
                        key={iteration}
                        iteration={parseInt(iteration)}
                        steps={steps}
                        totalIterations={message.iterations || 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message Content - All serif */}
            <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-p:font-serif prose-p:text-foreground prose-p:leading-relaxed prose-strong:font-serif prose-strong:text-foreground prose-a:font-serif prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:font-serif prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:bg-transparent prose-blockquote:pl-6 prose-blockquote:py-0 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-li:font-serif prose-table:font-serif">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => {
                    if (href?.includes("hklii.hk/en/cases/")) {
                      return (
                        <button
                          onClick={() => {
                            const citation = extractCitation(children);
                            onCaseClick(href, citation);
                          }}
                          className="inline-flex items-center gap-1.5 text-primary hover:underline font-serif"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          {children}
                        </button>
                      );
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="font-serif">
                        {children}
                      </a>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-6 my-6 text-muted-foreground italic font-serif">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full text-sm font-serif">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border px-4 py-3 text-left font-serif font-semibold text-muted-foreground">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-border/50 px-4 py-3 font-serif">
                      {children}
                    </td>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-semibold mt-8 mb-4 font-serif">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mt-6 mb-3 font-serif">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 font-serif">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="my-4 leading-7 font-serif">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-4 space-y-2 font-serif">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-4 space-y-2 font-serif">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7 font-serif">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold font-serif">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{children}</code>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function groupStepsByIteration(
  steps: ThinkingStep[]
): Record<number, ThinkingStep[]> {
  const grouped: Record<number, ThinkingStep[]> = {};

  for (const step of steps) {
    const iteration = step.iteration || 1;
    if (!grouped[iteration]) {
      grouped[iteration] = [];
    }
    grouped[iteration].push(step);
  }

  return grouped;
}

interface IterationBlockProps {
  iteration: number;
  steps: ThinkingStep[];
  totalIterations: number;
}

function IterationBlock({
  iteration,
  steps,
  totalIterations,
}: IterationBlockProps) {
  const thoughts = steps.filter((s) => s.type === "thought");
  const toolCalls = steps.filter((s) => s.type === "tool_call");
  const toolResults = steps.filter((s) => s.type === "tool_result");

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-card/50">
      {/* Iteration Header */}
      {totalIterations > 1 && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border/60">
          <span className="text-sm font-serif text-muted-foreground italic">
            Round {iteration} of {totalIterations}
          </span>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Thoughts */}
        {thoughts.map((thought, i) => (
          <p
            key={`thought-${i}`}
            className="text-sm font-serif text-muted-foreground italic leading-relaxed"
          >
            {thought.content}
          </p>
        ))}

        {/* Tool Calls */}
        {toolCalls.map((tc, i) => {
          const result = toolResults.find((r) => r.toolName === tc.toolName);
          return (
            <ToolCallCard
              key={`tool-${i}`}
              name={tc.toolName || "unknown"}
              args={tc.toolArgs || {}}
              result={result?.toolSummary}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ToolCallCardProps {
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

function ToolCallCard({ name, args, result }: ToolCallCardProps) {
  const isSearch = name === "searchCases";

  return (
    <div className="border border-border/40 rounded-md bg-background p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {isSearch ? (
            <Search className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-serif text-foreground">
              {isSearch ? "Search" : "Retrieve"}
            </span>
            {result && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            {!result && (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
          <p className="text-sm font-serif text-muted-foreground mt-1">
            {isSearch
              ? `"${(args as { query?: string }).query}"`
              : (args as { citation?: string }).citation}
          </p>
          {result && (
            <p className="text-xs font-serif text-primary mt-1">{result}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function extractCitation(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map(extractCitation).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return extractCitation(
      (children as { props?: { children?: React.ReactNode } }).props?.children
    );
  }
  return "";
}
