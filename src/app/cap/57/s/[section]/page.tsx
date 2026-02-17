import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatherIcon } from "@/components/ui/feather-icon";
import annotationsData from "@/data/cap57-annotations.json";
import { CAP57_SECTIONS } from "@/data/cap57-sections";

const COURT_LABELS: Record<string, string> = {
  hkcfa: "Court of Final Appeal",
  hkca: "Court of Appeal",
  hkcfi: "Court of First Instance",
  hkdc: "District Court",
  hkfc: "Family Court",
  hklat: "Lands Tribunal",
  hklt: "Labour Tribunal",
};

const COURT_SHORT: Record<string, string> = {
  hkcfa: "CFA",
  hkca: "CA",
  hkcfi: "CFI",
  hkdc: "DC",
  hkfc: "FC",
  hklat: "LAT",
  hklt: "LT",
};

type Props = {
  params: Promise<{ section: string }>;
};

export async function generateStaticParams() {
  return annotationsData.sections.map((s) => ({
    section: s.section,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: sectionId } = await params;
  const sectionDef = CAP57_SECTIONS.find((s) => s.section === sectionId);
  const sectionData = annotationsData.sections.find(
    (s) => s.section === sectionId
  );

  if (!sectionDef || !sectionData) return {};

  return {
    title: `Section ${sectionId} — ${sectionDef.titleEn} | Cap 57 Employment Ordinance | Casebird`,
    description: `${sectionDef.summary} Annotated with ${sectionData.cases.length} Hong Kong court decisions.`,
    keywords: [
      `section ${sectionId} employment ordinance`,
      `cap 57 section ${sectionId}`,
      sectionDef.titleEn.toLowerCase(),
      sectionDef.titleZh,
      "僱傭條例",
      "hong kong employment law",
    ],
    alternates: {
      canonical: `https://casebird.ai/cap/57/s/${sectionId}`,
    },
  };
}

export default async function SectionPage({ params }: Props) {
  const { section: sectionId } = await params;
  const sectionDef = CAP57_SECTIONS.find((s) => s.section === sectionId);
  const sectionData = annotationsData.sections.find(
    (s) => s.section === sectionId
  );

  if (!sectionDef || !sectionData) {
    notFound();
  }

  // Find adjacent sections for navigation
  const allSections = annotationsData.sections;
  const currentIndex = allSections.findIndex((s) => s.section === sectionId);
  const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
  const nextSection =
    currentIndex < allSections.length - 1
      ? allSections[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
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
              href="/cap/57"
              className="text-sm font-serif text-muted-foreground hover:text-foreground transition-colors"
            >
              Cap. 57 — Employment Ordinance
            </Link>
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            Section {sectionId}
          </h1>
          <p className="text-xl font-serif text-foreground mt-1">
            {sectionDef.titleEn}
          </p>
          <p className="text-lg font-serif text-muted-foreground mt-0.5">
            {sectionDef.titleZh}
          </p>
          <p className="font-serif text-xs text-muted-foreground mt-2">
            Part {sectionDef.part} — {sectionDef.partTitleEn} (
            {sectionDef.partTitleZh})
          </p>
        </div>

        {/* Summary */}
        {sectionDef.summary && (
          <div className="mb-8 p-4 bg-muted/30 border border-border rounded-lg">
            <p className="font-serif text-foreground leading-relaxed text-sm">
              {sectionDef.summary}
            </p>
            <p className="font-serif text-xs text-muted-foreground mt-2">
              Full text:{" "}
              <a
                href={`https://www.elegislation.gov.hk/hk/cap57!en-zh-Hant-HK?INDEX_CS=N&xpid=ID_1438402821129_004`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                e-Legislation
              </a>
            </p>
          </div>
        )}

        {/* Cases */}
        {sectionData.cases.length > 0 ? (
          <div>
            <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
              Key Cases ({sectionData.cases.length})
            </h2>
            <div className="space-y-6">
              {sectionData.cases.map((caseItem, i) => (
                <article
                  key={caseItem.citation}
                  className="border border-border rounded-lg p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <a
                        href={caseItem.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-serif font-semibold text-primary hover:underline"
                      >
                        {caseItem.citation}
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {COURT_SHORT[caseItem.court] ||
                            caseItem.court.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {caseItem.year}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {caseItem.language === "TC" ? "中文" : "English"}
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
        ) : (
          <div className="text-center py-12 text-muted-foreground font-serif">
            <p>
              No annotated cases found for this section yet. Case annotations
              are being expanded.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex justify-between items-center pt-6 border-t border-border">
          {prevSection ? (
            <Link
              href={`/cap/57/s/${prevSection.section}`}
              className="font-serif text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; s.{prevSection.section} {prevSection.titleEn}
            </Link>
          ) : (
            <div />
          )}
          {nextSection ? (
            <Link
              href={`/cap/57/s/${nextSection.section}`}
              className="font-serif text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
            >
              s.{nextSection.section} {nextSection.titleEn} &rarr;
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-border text-center">
          <p className="font-serif text-foreground mb-3">
            Need more cases about Section {sectionId} of the Employment
            Ordinance?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-serif font-medium hover:bg-primary/90 transition-colors"
          >
            <FeatherIcon className="w-4 h-4" />
            Research with Casebird
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground font-serif">
          <p>
            Case annotations are AI-generated summaries for reference purposes
            only. They do not constitute legal advice. Always verify against the
            original judgment.
          </p>
        </footer>
      </div>
    </div>
  );
}
