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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-serif font-semibold text-foreground">
          Legislation Text
        </h2>
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
        className="legislation-text border border-border rounded-lg p-5 bg-muted/20 font-serif text-sm text-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
