"use client";

import { useState } from "react";
import { CaseViewer } from "@/components/chat/CaseViewer";

const COURT_SHORT: Record<string, string> = {
  hkcfa: "CFA",
  hkca: "CA",
  hkcfi: "CFI",
  hkdc: "DC",
  hkfc: "FC",
  hklat: "LAT",
  hklt: "LT",
};

interface CaseItem {
  citation: string;
  caseName?: string;
  court: string;
  year: number;
  annotation: string;
}

function getCaseUrl(citation: string, court: string, year: number): string {
  const numberMatch = citation.match(/(\d+)\s*$/);
  if (numberMatch) {
    return `https://www.hklii.hk/en/cases/${court.toLowerCase()}/${year}/${numberMatch[1]}`;
  }
  return "";
}

interface AnnotatedCaseListProps {
  cases: CaseItem[];
}

export function AnnotatedCaseList({ cases }: AnnotatedCaseListProps) {
  const [selectedCase, setSelectedCase] = useState<{
    url: string;
    citation: string;
  } | null>(null);

  const handleCaseClick = (caseItem: CaseItem) => {
    const url = getCaseUrl(caseItem.citation, caseItem.court, caseItem.year);
    if (url) {
      setSelectedCase({ url, citation: caseItem.citation });
    }
  };

  return (
    <div className={selectedCase ? "flex gap-0" : ""}>
      {/* Case list */}
      <div className={selectedCase ? "w-full md:w-1/2 md:pr-4" : "w-full"}>
        <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
          Key Cases ({cases.length})
        </h2>
        <div className="space-y-6">
          {cases.map((caseItem) => (
            <article
              key={caseItem.citation}
              className="border border-border rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <button
                    onClick={() => handleCaseClick(caseItem)}
                    className="font-serif font-semibold text-primary hover:underline text-left cursor-pointer"
                  >
                    {caseItem.citation}
                  </button>
                  {caseItem.caseName && (
                    <p className="font-serif text-base font-medium text-foreground mt-1 italic">
                      {caseItem.caseName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {COURT_SHORT[caseItem.court] ||
                        caseItem.court.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {caseItem.year}
                    </span>
                  </div>
                </div>
              </div>
              <p className="font-serif text-sm text-foreground leading-relaxed">
                {caseItem.annotation}
              </p>
            </article>
          ))}
        </div>
      </div>

      {/* Desktop side panel */}
      {selectedCase && (
        <div className="hidden md:block fixed top-0 right-0 w-1/2 h-full z-40 shadow-xl">
          <CaseViewer
            url={selectedCase.url}
            citation={selectedCase.citation}
            onClose={() => setSelectedCase(null)}
          />
        </div>
      )}

      {/* Mobile bottom sheet */}
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
    </div>
  );
}
