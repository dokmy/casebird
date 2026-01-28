"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Zap, Scale, Search } from "lucide-react";
import { ResearchMode, RESEARCH_MODE_CONFIG } from "@/types/chat";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, mode: ResearchMode) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ResearchMode>("normal");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed, mode);
      setInput("");
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

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto">
        {/* Mode selector */}
        <div className="flex items-center justify-center gap-1 mb-3">
          {(Object.keys(RESEARCH_MODE_CONFIG) as ResearchMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded-full transition-all",
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

        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Hong Kong case law..."
            disabled={isLoading || disabled}
            className="min-h-[60px] max-h-[200px] resize-none pr-12 bg-card"
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
        <p className="text-xs text-muted-foreground mt-2 text-center font-serif">
          Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
