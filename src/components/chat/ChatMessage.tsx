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
  onQuestionClick?: (question: string) => void;
}

export function ChatMessage({ message, onCaseClick, onQuestionClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  const hasThinkingSteps =
    message.thinkingSteps && message.thinkingSteps.length > 0;

  // Message is complete when it has content
  const isComplete = message.content.length > 0;

  // Auto-expand while streaming (no content yet), collapse once done
  const [showThinking, setShowThinking] = useState(false);
  const isStreaming = hasThinkingSteps && !isComplete;

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
                  {(showThinking || isStreaming) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-serif italic">Research Process</span>
                  {typeof message.iterations === "number" && message.iterations > 0 && (
                    <span className="text-primary font-serif">
                      — {message.iterations} round
                      {message.iterations > 1 ? "s" : ""}
                    </span>
                  )}
                </button>

                {(showThinking || isStreaming) && (
                  <div className="mt-4 space-y-4">
                    {Object.entries(groupedSteps).map(([iteration, steps]) => (
                      <IterationBlock
                        key={iteration}
                        iteration={parseInt(iteration)}
                        steps={steps}
                        totalIterations={message.iterations || 1}
                        isComplete={isComplete}
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
                    // Match HKLII case URLs (both /en/ and /tc/)
                    if (href && /hklii\.hk\/(en|tc)\/cases\//.test(href)) {
                      return (
                        <button
                          onClick={() => {
                            const citation = extractCitation(children);
                            // Use backend-built URL if available (Gemini may use wrong language)
                            const correctUrl = (message.caseUrls && findUrlByCitation(message.caseUrls, citation)) || href;
                            onCaseClick(correctUrl, citation);
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

            {/* Follow-up Questions */}
            {!isUser && message.followUpQuestions && message.followUpQuestions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs font-serif uppercase tracking-wider text-muted-foreground mb-3">
                  Follow-up questions
                </p>
                <div className="space-y-2">
                  {message.followUpQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => onQuestionClick?.(question)}
                      className="w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 border border-border rounded-lg transition-colors group"
                    >
                      <div className="text-sm font-serif text-foreground group-hover:text-primary transition-colors">
                        {question}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
  isComplete: boolean;
}

function IterationBlock({
  iteration,
  steps,
  totalIterations,
  isComplete,
}: IterationBlockProps) {
  const thoughts = steps.filter((s) => s.type === "thought" || s.type === "iteration" || s.type === "reasoning" || s.type === "continue" || s.type === "limit");
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
          <div
            key={`thought-${i}`}
            className="text-sm font-serif text-muted-foreground italic leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:font-serif prose-p:italic prose-p:text-muted-foreground prose-strong:text-muted-foreground prose-strong:font-semibold"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thought.content}
            </ReactMarkdown>
          </div>
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
              isComplete={isComplete}
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
  isComplete: boolean;
}

function ToolCallCard({ name, args, result, isComplete }: ToolCallCardProps) {
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
            {(result || isComplete) && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            {!result && !isComplete && (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
          <p className="text-sm font-serif text-muted-foreground mt-1">
            {isSearch
              ? `"${(args as { query?: string }).query}"`
              : (args as { citation?: string }).citation}
          </p>
          {isSearch && (() => {
            const searchArgs = args as { language?: string; court?: string; yearFrom?: number; yearTo?: number };
            const filters: string[] = [];
            if (searchArgs.language) filters.push(searchArgs.language === "EN" ? "English" : "中文");
            if (searchArgs.court) filters.push(searchArgs.court.toUpperCase());
            if (searchArgs.yearFrom && searchArgs.yearTo) filters.push(`${searchArgs.yearFrom}–${searchArgs.yearTo}`);
            else if (searchArgs.yearFrom) filters.push(`${searchArgs.yearFrom}+`);
            else if (searchArgs.yearTo) filters.push(`–${searchArgs.yearTo}`);
            return filters.length > 0 ? (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {filters.map((f, i) => (
                  <span key={i} className="text-[10px] font-serif px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f}</span>
                ))}
              </div>
            ) : null;
          })()}
          {result && (
            <p className="text-xs font-serif text-primary mt-1">{result}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function findUrlByCitation(caseUrls: Record<string, string>, citation: string): string | undefined {
  // Exact match first
  if (caseUrls[citation]) return caseUrls[citation];
  // Try matching by checking if the citation text contains a known citation key
  for (const [key, url] of Object.entries(caseUrls)) {
    if (citation.includes(key) || key.includes(citation)) return url;
  }
  return undefined;
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
