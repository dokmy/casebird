"use client";

import { useState } from "react";

interface LegislationTextProps {
  textEn?: string;
  textZh?: string;
}

export function LegislationText({ textEn, textZh }: LegislationTextProps) {
  const [lang, setLang] = useState<"en" | "zh">(textEn ? "en" : "zh");

  const html = lang === "en" ? textEn : textZh;
  if (!html) return null;

  return (
    <div className="mb-8 border-l-4 border-primary/30 bg-card rounded-r-lg shadow-sm">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-4 h-4 text-primary/60"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Statutory Text
          </span>
        </div>
        {textEn && textZh && (
          <div className="flex gap-1 text-xs font-mono">
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("zh")}
              className={`px-2 py-0.5 rounded transition-colors ${
                lang === "zh"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              中文
            </button>
          </div>
        )}
      </div>
      <div
        className="legislation-text px-5 pb-5 font-serif text-[13px] text-foreground/85 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
