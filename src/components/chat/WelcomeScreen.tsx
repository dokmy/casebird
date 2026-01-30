"use client";

import { useState } from "react";
import { Shield, Gavel, Building2, Briefcase, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatherIcon } from "@/components/ui/feather-icon";

interface WelcomeScreenProps {
  onExampleClick: (query: string) => void;
  outputLanguage?: "EN" | "TC";
}

const FIELDS = [
  { id: "criminal", label: "Criminal", icon: Gavel },
  { id: "pi", label: "Personal Injury", icon: Shield },
  { id: "corporate", label: "Corporate", icon: Building2 },
  { id: "inhouse", label: "In-house", icon: Briefcase },
  { id: "insurance", label: "Insurance", icon: FileCheck },
] as const;

const SAMPLE_QUERIES: Record<string, { title: string; query: string }[]> = {
  criminal: [
    {
      title: "Sentencing for dangerous driving",
      query: "What are the sentencing guidelines and recent precedents for dangerous driving causing death under s.36 of the Road Traffic Ordinance in Hong Kong?",
    },
    {
      title: "Bail conditions for fraud charges",
      query: "What bail conditions have Hong Kong courts imposed in large-scale commercial fraud cases, and what factors are considered?",
    },
    {
      title: "Triad-related offences sentencing",
      query: "Find recent Hong Kong sentencing precedents for offences under the Organized and Serious Crimes Ordinance (Cap. 455), particularly for triad-related activities.",
    },
  ],
  pi: [
    {
      title: "PSLA awards for shoulder injury",
      query: "Find Hong Kong personal injury cases where the plaintiff suffered a rotator cuff tear with PSLA awards between HK$200,000 and HK$500,000",
    },
    {
      title: "Loss of earning capacity for young plaintiff",
      query: "How have Hong Kong courts assessed loss of future earning capacity for plaintiffs under 30 who suffered permanent disability in workplace accidents?",
    },
    {
      title: "Contributory negligence in traffic accidents",
      query: "Find Hong Kong cases where contributory negligence was assessed for pedestrians hit by vehicles, and what percentage reductions were applied.",
    },
  ],
  corporate: [
    {
      title: "Director liability for breach of duty",
      query: "What is the standard for holding directors personally liable for breach of fiduciary duty in Hong Kong, and what remedies have the courts awarded?",
    },
    {
      title: "Unfair prejudice petitions",
      query: "Find Hong Kong cases on unfair prejudice petitions under s.724 of the Companies Ordinance. What conduct has the court found to be unfairly prejudicial to minority shareholders?",
    },
    {
      title: "Shareholder derivative actions",
      query: "What are the requirements for bringing a statutory derivative action under Part 14 Division 4 of the Companies Ordinance in Hong Kong?",
    },
  ],
  inhouse: [
    {
      title: "Legal professional privilege for in-house counsel",
      query: "How do Hong Kong courts treat legal professional privilege for communications with in-house lawyers? Are there any limitations compared to external counsel?",
    },
    {
      title: "Employment non-compete enforceability",
      query: "Find Hong Kong cases on the enforceability of non-compete clauses in employment contracts. What factors make a restraint of trade clause reasonable?",
    },
    {
      title: "Data privacy breach liability",
      query: "What are the legal consequences under Hong Kong's Personal Data (Privacy) Ordinance for companies that suffer data breaches, and what enforcement actions has the PCPD taken?",
    },
  ],
  insurance: [
    {
      title: "Fraud in PI claims",
      query: "Find cases where personal injury claims were dismissed or reduced due to surveillance evidence of exaggeration or fraud in Hong Kong",
    },
    {
      title: "Insurer's duty to indemnify",
      query: "Find Hong Kong cases where insurers disputed their duty to indemnify on grounds of non-disclosure or misrepresentation by the insured under the Insurance Ordinance.",
    },
    {
      title: "Subrogation rights disputes",
      query: "How have Hong Kong courts dealt with disputes over an insurer's right of subrogation, particularly where the insured has already settled with the tortfeasor?",
    },
  ],
};

export function WelcomeScreen({ onExampleClick, outputLanguage = "EN" }: WelcomeScreenProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const isChinese = outputLanguage === "TC";

  const samples = activeField ? SAMPLE_QUERIES[activeField] || [] : [];

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      {/* Logo & branding */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
          <FeatherIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground">Casebird</h1>
        <p className="font-serif text-muted-foreground mt-1.5 text-sm sm:text-base">
          {isChinese
            ? "搜尋 200,000+ 香港法律案例"
            : "Search 200,000+ Hong Kong legal cases instantly"}
        </p>
      </div>

      {/* Field chips */}
      <div className="mb-4">
        <p className="text-xs font-serif text-muted-foreground mb-2">
          {isChinese ? "選擇領域查看示例查詢" : "Try a sample enquiry"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {FIELDS.map((field) => (
            <button
              key={field.id}
              onClick={() => setActiveField(activeField === field.id ? null : field.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded-full transition-all border",
                activeField === field.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              <field.icon className="w-3.5 h-3.5" />
              {field.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sample inquiries */}
      {activeField && samples.length > 0 && (
        <div className="space-y-2 text-left">
          {samples.map((sample, i) => (
            <button
              key={i}
              onClick={() => onExampleClick(sample.query)}
              className="w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="font-serif font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                {sample.title}
              </div>
              <div className="font-serif text-xs leading-relaxed text-muted-foreground mt-0.5 line-clamp-2">
                {sample.query}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="font-serif text-xs text-muted-foreground mt-4 italic">
        {isChinese
          ? "Casebird 僅提供法律研究輔助。請務必核實案例引用，並就法律建議諮詢合資格的法律顧問。"
          : "Casebird provides legal research assistance only. Always verify case citations and consult qualified legal counsel for legal advice."}
      </p>
    </div>
  );
}
