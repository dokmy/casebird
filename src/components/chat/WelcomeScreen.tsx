"use client";

import { Shield, Gavel, Building2, Briefcase } from "lucide-react";
import { ResearchMode } from "@/types/chat";
import { FeatherIcon } from "@/components/ui/feather-icon";

interface WelcomeScreenProps {
  onExampleClick: (example: string, mode: ResearchMode) => void;
}

const EXAMPLES = [
  {
    icon: Shield,
    role: "Personal Injury",
    title: "PSLA awards for shoulder injury",
    query: "Find Hong Kong personal injury cases where the plaintiff suffered a rotator cuff tear with PSLA awards between HK$200,000 and HK$500,000",
  },
  {
    icon: Gavel,
    role: "Criminal Defence",
    title: "Sentencing for dangerous driving",
    query: "What are the sentencing guidelines and recent precedents for dangerous driving causing death under s.36 of the Road Traffic Ordinance in Hong Kong?",
  },
  {
    icon: Building2,
    role: "Insurance Claims",
    title: "Fraud in PI claims",
    query: "Find cases where personal injury claims were dismissed or reduced due to surveillance evidence of exaggeration or fraud in Hong Kong",
  },
  {
    icon: Briefcase,
    role: "Corporate / In-House",
    title: "Director liability for breach",
    query: "What is the standard for holding directors personally liable for breach of fiduciary duty in Hong Kong, and what remedies have the courts awarded?",
  },
];

export function WelcomeScreen({ onExampleClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <FeatherIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">Casebird</h1>
          <p className="font-serif text-muted-foreground mt-2">
            Your AI-powered Hong Kong legal research assistant
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8 text-sm font-serif">
          <div>
            <div className="text-2xl font-semibold text-primary">1.3M+</div>
            <div className="text-muted-foreground">Legal cases</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-primary">5</div>
            <div className="text-muted-foreground">Courts covered</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-primary">EN/TC</div>
            <div className="text-muted-foreground">Bilingual</div>
          </div>
        </div>

        {/* Examples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => onExampleClick(example.query, "normal")}
              className="flex items-start gap-3 p-5 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <example.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-serif text-[10px] uppercase tracking-widest text-primary/70 mb-0.5">
                  {example.role}
                </div>
                <div className="font-serif font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                  {example.title}
                </div>
                <div className="font-serif text-[11px] leading-relaxed text-muted-foreground mt-1">
                  {example.query}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="font-serif text-xs text-muted-foreground mt-8 italic">
          Casebird provides legal research assistance only. Always verify case citations and consult qualified legal counsel for legal advice.
        </p>
        </div>
      </div>
    </div>
  );
}
