import Link from "next/link";
import { Metadata } from "next";
import { FeatherIcon } from "@/components/ui/feather-icon";
import annotationsData from "@/data/cap57-annotations.json";

export const metadata: Metadata = {
  title: "Cap 57 — Employment Ordinance (僱傭條例) | Annotated Case Law | Casebird",
  description:
    "Free annotated guide to Hong Kong's Employment Ordinance (Cap. 57 / 僱傭條例). Section-by-section case law analysis covering dismissal, wages, severance, long service payment, and more.",
  keywords: [
    "cap 57",
    "employment ordinance",
    "僱傭條例",
    "hong kong employment law",
    "employment ordinance cap 57",
    "hong kong labour law",
    "勞工法例",
    "annotated ordinance",
  ],
  alternates: {
    canonical: "https://casebird.ai/cap/57",
  },
};

const COURT_LABELS: Record<string, string> = {
  hkcfa: "CFA",
  hkca: "CA",
  hkcfi: "CFI",
  hkdc: "DC",
  hkfc: "FC",
  hklat: "LAT",
  hklt: "LT",
};

// Group sections by Part
function groupByPart(
  sections: typeof annotationsData.sections
): Map<string, typeof annotationsData.sections> {
  const { CAP57_SECTIONS } = require("@/data/cap57-sections");
  const groups = new Map<string, typeof annotationsData.sections>();

  for (const section of sections) {
    const def = CAP57_SECTIONS.find(
      (s: { section: string }) => s.section === section.section
    );
    const partKey = def
      ? `Part ${def.part} — ${def.partTitleEn} (${def.partTitleZh})`
      : "Other";
    if (!groups.has(partKey)) groups.set(partKey, []);
    groups.get(partKey)!.push(section);
  }

  return groups;
}

export default function Cap57Page() {
  const { sections, stats, metadata: capMeta } = annotationsData;
  const grouped = groupByPart(sections);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-serif font-medium text-foreground hover:text-primary transition-colors mb-6"
          >
            <FeatherIcon className="w-5 h-5" />
            Casebird
          </Link>
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            Cap. 57 — Employment Ordinance
          </h1>
          <p className="text-2xl font-serif text-muted-foreground mt-1">
            僱傭條例
          </p>
          <p className="font-serif text-sm text-muted-foreground mt-3">
            Enacted 1968 &middot; Last amended {capMeta.lastAmended} &middot;{" "}
            {stats.totalCases} annotated cases across {stats.sectionsWithCases}{" "}
            sections
          </p>
        </div>

        {/* Introduction */}
        <div className="font-serif text-foreground leading-relaxed mb-10">
          <p className="mb-4">
            The Employment Ordinance (Cap. 57) is the principal legislation
            governing employment conditions in Hong Kong. Since its enactment in
            1968, it has been extensively amended to provide comprehensive
            protections for employees, covering contracts of employment, wages,
            rest days, holidays, sickness allowance, maternity protection,
            severance payments, long service payments, and employment protection
            against unreasonable dismissal.
          </p>
          <p className="text-sm text-muted-foreground">
            This annotated guide links key sections of the Ordinance to relevant
            court decisions from the Hong Kong judiciary. Each case annotation
            summarises how the court interpreted or applied the provision.
            Official text:{" "}
            <a
              href={capMeta.elegislationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              e-Legislation
            </a>{" "}
            &middot;{" "}
            <a
              href={capMeta.hkliiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              HKLII
            </a>
          </p>
        </div>

        {/* Section Table */}
        <div className="space-y-8">
          {[...grouped.entries()].map(([partLabel, partSections]) => (
            <div key={partLabel}>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-3 border-b border-border pb-2">
                {partLabel}
              </h2>
              <div className="divide-y divide-border">
                {partSections.map((section) => (
                  <Link
                    key={section.section}
                    href={`/cap/57/s/${section.section}`}
                    className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-serif">
                        <span className="font-semibold text-foreground">
                          s.{section.section}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {section.titleEn}
                        </span>
                        <span className="text-muted-foreground/70 ml-2 text-sm">
                          {section.titleZh}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {section.cases.length > 0 ? (
                        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {section.cases.length}{" "}
                          {section.cases.length === 1 ? "case" : "cases"}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground/50 px-2 py-0.5">
                          —
                        </span>
                      )}
                      <svg
                        className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg border border-border text-center">
          <p className="font-serif text-foreground mb-3">
            Need deeper research on the Employment Ordinance?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-serif font-medium hover:bg-primary/90 transition-colors"
          >
            <FeatherIcon className="w-4 h-4" />
            Research with Casebird
          </Link>
          <p className="text-xs text-muted-foreground mt-2">
            AI-powered case law search across 1.3M+ Hong Kong legal documents
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground font-serif">
          <p>
            Case annotations are AI-generated summaries for reference purposes
            only. They do not constitute legal advice. Always verify against the
            original judgment.
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>{" "}
            &middot;{" "}
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
