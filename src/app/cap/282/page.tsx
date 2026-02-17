import Link from "next/link";
import { Metadata } from "next";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { WarningBanner } from "@/components/ui/warning-banner";
import annotationsData from "@/data/cap282-annotations.json";

export const metadata: Metadata = {
  title: "Cap 282 — Employees' Compensation Ordinance (僱員補償條例) | Annotated Case Law | Casebird",
  description:
    "Free annotated guide to Hong Kong's Employees' Compensation Ordinance (Cap. 282 / 僱員補償條例). Section-by-section case law analysis covering work injury, fatal cases, incapacity, insurance, and more.",
  keywords: [
    "cap 282",
    "employees compensation ordinance",
    "僱員補償條例",
    "hong kong work injury",
    "employees compensation cap 282",
    "hong kong labour law",
    "工傷補償",
    "annotated ordinance",
  ],
  alternates: {
    canonical: "https://casebird.ai/cap/282",
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
  const { CAP282_SECTIONS } = require("@/data/cap282-sections");
  const groups = new Map<string, typeof annotationsData.sections>();

  for (const section of sections) {
    const def = CAP282_SECTIONS.find(
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

export default function Cap282Page() {
  const { sections, metadata: capMeta } = annotationsData;
  const totalCases = sections.reduce((sum, s) => sum + s.cases.length, 0);
  const sectionsWithCases = sections.filter((s) => s.cases.length > 0).length;
  const grouped = groupByPart(sections);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-serif font-medium text-foreground hover:text-primary transition-colors mb-4"
          >
            <FeatherIcon className="w-5 h-5" />
            Casebird
          </Link>
          <div className="mb-4">
            <Link
              href="/cap"
              className="text-sm font-serif text-muted-foreground hover:text-foreground transition-colors"
            >
              Annotated Ordinances
            </Link>
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            Cap. 282 — Employees&apos; Compensation Ordinance
          </h1>
          <p className="text-2xl font-serif text-muted-foreground mt-1">
            僱員補償條例
          </p>
          <p className="font-serif text-sm text-muted-foreground mt-3">
            Enacted 1953 &middot; Last amended {capMeta.lastAmended} &middot;{" "}
            {totalCases} annotated cases across {sectionsWithCases} sections
          </p>
        </div>

        <WarningBanner />

        {/* Introduction */}
        <div className="font-serif text-foreground leading-relaxed mb-10">
          <p className="mb-4">
            The Employees&apos; Compensation Ordinance (Cap. 282) is the
            principal legislation governing compensation for work-related
            injuries and occupational diseases in Hong Kong. It establishes a
            no-fault statutory compensation scheme under which employers are
            liable to compensate employees who suffer personal injury by accident
            arising out of and in the course of employment, covering fatal cases,
            permanent incapacity, temporary incapacity, medical expenses, and
            occupational diseases.
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
                    href={`/cap/282/s/${section.section}`}
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
            Need deeper research on the Employees&apos; Compensation Ordinance?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-serif font-medium hover:bg-primary/90 transition-colors"
          >
            <FeatherIcon className="w-4 h-4 [&_path]:stroke-primary-foreground [&_path]:fill-primary-foreground" />
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
