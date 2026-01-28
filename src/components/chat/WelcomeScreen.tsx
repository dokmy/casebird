"use client";

import { Scale, Search, FileText, MessageSquare } from "lucide-react";
import { ResearchMode } from "@/types/chat";

interface WelcomeScreenProps {
  onExampleClick: (example: string, mode: ResearchMode) => void;
}

const EXAMPLES = [
  {
    icon: Search,
    title: "Find precedents",
    query: "What are the leading cases on breach of employment contract in Hong Kong?",
  },
  {
    icon: Scale,
    title: "Legal principles",
    query: "What is the test for judicial review in Hong Kong?",
  },
  {
    icon: FileText,
    title: "Case analysis",
    query: "Explain the doctrine of legitimate expectations under Hong Kong law",
  },
  {
    icon: MessageSquare,
    title: "Court decisions",
    query: "What has the Court of Final Appeal said about constitutional interpretation?",
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
            <Scale className="w-8 h-8 text-primary" />
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
              className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <example.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-serif font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {example.title}
                </div>
                <div className="font-serif text-xs text-muted-foreground mt-1 line-clamp-2">
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
