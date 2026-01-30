"use client";

import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Zap, Scale, Search, ChevronDown } from "lucide-react";
import { ResearchMode, CaseLanguage, RESEARCH_MODE_CONFIG } from "@/types/chat";
import { cn } from "@/lib/utils";

const CASE_LANGUAGE_OPTIONS: { value: CaseLanguage; label: string }[] = [
  { value: "any", label: "All languages" },
  { value: "EN", label: "English only" },
  { value: "TC", label: "中文 only" },
];

interface ChatInputProps {
  onSend: (message: string, mode: ResearchMode) => void;
  isLoading: boolean;
  disabled?: boolean;
  caseLanguage: CaseLanguage;
  onCaseLanguageChange: (lang: CaseLanguage) => void;
  caseLanguageLocked?: boolean;
  messageCount?: number;
  messageLimit?: number;
  input: string;
  onInputChange: (value: string) => void;
}

export function ChatInput({ onSend, isLoading, disabled, caseLanguage, onCaseLanguageChange, caseLanguageLocked, messageCount, messageLimit, input, onInputChange: setInput }: ChatInputProps) {
  const [mode, setMode] = useState<ResearchMode>("normal");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const minH = window.innerWidth < 640 ? 66 : 88;
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minH), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showLangMenu]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed, mode);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const modeIcons: Record<ResearchMode, React.ReactNode> = {
    fast: <Zap className="w-3.5 h-3.5" />,
    normal: <Scale className="w-3.5 h-3.5" />,
    deep: <Search className="w-3.5 h-3.5" />,
  };

  const currentLangLabel = CASE_LANGUAGE_OPTIONS.find((o) => o.value === caseLanguage)?.label || "All languages";

  return (
    <div className="border-t bg-background px-3 pt-4 pb-2 sm:p-4">
      <div className="max-w-3xl mx-auto">
        {/* Mode selector & case language dropdown */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-3">
          {/* Research mode */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {(Object.keys(RESEARCH_MODE_CONFIG) as ResearchMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-serif rounded-full transition-all",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title={RESEARCH_MODE_CONFIG[m].description}
              >
                {modeIcons[m]}
                <span>{RESEARCH_MODE_CONFIG[m].label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-border" />

          {/* Case language dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => !caseLanguageLocked && setShowLangMenu(!showLangMenu)}
              disabled={isLoading || caseLanguageLocked}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-serif rounded-full transition-all",
                caseLanguageLocked
                  ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              title={caseLanguageLocked ? "Case language is locked for this conversation. Start a new chat to change it." : undefined}
            >
              <span className="text-muted-foreground/70">Cases:</span>
              <span className={caseLanguage !== "any" && !caseLanguageLocked ? "text-foreground" : ""}>
                {currentLangLabel}
              </span>
              {!caseLanguageLocked && <ChevronDown className="w-3 h-3" />}
            </button>

            {showLangMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                {CASE_LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onCaseLanguageChange(opt.value);
                      setShowLangMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-serif transition-colors",
                      caseLanguage === opt.value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Hong Kong case law..."
            disabled={isLoading || disabled}
            className="min-h-[66px] sm:min-h-[88px] max-h-[200px] resize-none pr-12 bg-card text-sm"
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <p className="text-xs text-muted-foreground text-center font-serif">
            Press Enter to send, Shift+Enter for new line.
          </p>
          {messageCount !== undefined && messageLimit !== undefined && (
            <p className={cn(
              "text-xs font-serif",
              messageCount >= messageLimit * 0.8 ? "text-orange-500" : "text-muted-foreground"
            )}>
              {messageCount}/{messageLimit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
