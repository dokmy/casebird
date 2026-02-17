import Link from "next/link";
import { Metadata } from "next";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { WarningBanner } from "@/components/ui/warning-banner";
import cap57Data from "@/data/cap57-annotations.json";
import cap282Data from "@/data/cap282-annotations.json";

export const metadata: Metadata = {
  title: "Annotated Hong Kong Ordinances | Case Law Guides | Casebird",
  description:
    "Free annotated guides to Hong Kong legislation. Section-by-section case law analysis of the Employment Ordinance (Cap. 57), Employees' Compensation Ordinance (Cap. 282), and more.",
  keywords: [
    "hong kong ordinances",
    "annotated legislation",
    "hong kong law",
    "case law",
    "香港法例",
    "法例註釋",
  ],
  alternates: {
    canonical: "https://casebird.ai/cap",
  },
};

const ORDINANCES = [
  {
    cap: 57,
    titleEn: "Employment Ordinance",
    titleZh: "僱傭條例",
    description:
      "The principal legislation governing employment conditions — contracts, wages, rest days, holidays, severance, long service payments, and employment protection.",
    data: cap57Data,
    href: "/cap/57",
    live: true,
  },
  {
    cap: 282,
    titleEn: "Employees' Compensation Ordinance",
    titleZh: "僱員補償條例",
    description:
      "No-fault statutory compensation for work injuries and occupational diseases — fatal cases, incapacity, medical expenses, compulsory insurance, and direct actions against insurers.",
    data: cap282Data,
    href: "/cap/282",
    live: true,
  },
];

export default function CapIndexPage() {
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
            Annotated Hong Kong Ordinances
          </h1>
          <p className="text-2xl font-serif text-muted-foreground mt-1">
            香港法例註釋
          </p>
        </div>

        <WarningBanner />

        {/* Introduction */}
        <div className="font-serif text-foreground leading-relaxed mb-10">
          <p className="mb-4">
            Free, AI-annotated guides to key Hong Kong legislation.
            Each section is linked to relevant court decisions from the
            Hong Kong judiciary, with concise summaries of how the courts
            have interpreted and applied the law.
          </p>
          <p className="text-sm text-muted-foreground">
            Case annotations are generated from 1.3M+ indexed legal documents.
            Always verify against the original judgment.
          </p>
        </div>

        {/* Ordinance Cards */}
        <div className="space-y-4">
          {ORDINANCES.map((ord) => {
            const totalCases = ord.data.sections.reduce(
              (sum, s) => sum + s.cases.length,
              0
            );
            const sectionsWithCases = ord.data.sections.filter(
              (s) => s.cases.length > 0
            ).length;

            if (ord.live) {
              return (
                <Link
                  key={ord.cap}
                  href={ord.href}
                  className="block border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-serif font-semibold text-foreground group-hover:text-primary transition-colors">
                        Cap. {ord.cap} — {ord.titleEn}
                      </h2>
                      <p className="text-lg font-serif text-muted-foreground mt-0.5">
                        {ord.titleZh}
                      </p>
                      <p className="font-serif text-sm text-muted-foreground mt-2 leading-relaxed">
                        {ord.description}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {totalCases} cases
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {sectionsWithCases} sections
                      </span>
                      <svg
                        className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors"
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
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={ord.cap}
                className="border border-border/50 rounded-lg p-6 opacity-60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-serif font-semibold text-muted-foreground">
                      Cap. {ord.cap} — {ord.titleEn}
                    </h2>
                    <p className="text-lg font-serif text-muted-foreground/70 mt-0.5">
                      {ord.titleZh}
                    </p>
                    <p className="font-serif text-sm text-muted-foreground/70 mt-2 leading-relaxed">
                      {ord.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    Coming soon
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg border border-border text-center">
          <p className="font-serif text-foreground mb-3">
            Need to research a specific legal question?
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
