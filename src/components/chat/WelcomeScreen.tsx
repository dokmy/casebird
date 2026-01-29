"use client";

import { Shield, Gavel, Building2, Briefcase } from "lucide-react";
import { ResearchMode } from "@/types/chat";
import { FeatherIcon } from "@/components/ui/feather-icon";

interface WelcomeScreenProps {
  onExampleClick: (example: string, mode: ResearchMode) => void;
  showFooter?: boolean;
  outputLanguage?: "EN" | "TC";
}

const EXAMPLES_EN = [
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

const EXAMPLES_TC = [
  {
    icon: Shield,
    role: "人身傷害",
    title: "肩傷的痛楚及損失賠償",
    query: "搜尋香港人身傷害案例，原告人肩袖撕裂，痛楚、痛苦及喪失生活樂趣的賠償金額介乎港幣200,000至500,000元",
  },
  {
    icon: Gavel,
    role: "刑事辯護",
    title: "危險駕駛的量刑指引",
    query: "香港《道路交通條例》第36條危險駕駛引致死亡的量刑指引及近期案例有哪些？",
  },
  {
    icon: Building2,
    role: "保險索償",
    title: "人身傷害索償中的欺詐",
    query: "搜尋香港因監控證據顯示誇大傷勢或欺詐而被駁回或減少賠償的人身傷害索償案例",
  },
  {
    icon: Briefcase,
    role: "企業法務",
    title: "董事違反信義責任",
    query: "在香港，追究董事個人因違反受信責任而承擔法律責任的標準是什麼？法院曾判給哪些補救措施？",
  },
];

export function WelcomeScreen({ onExampleClick, showFooter, outputLanguage = "EN" }: WelcomeScreenProps) {
  const isChinese = outputLanguage === "TC";
  const examples = isChinese ? EXAMPLES_TC : EXAMPLES_EN;

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
            {isChinese
              ? "AI 驅動的香港法律研究助理"
              : "Your AI-powered Hong Kong legal research assistant"}
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8 text-sm font-serif">
          <div>
            <div className="text-2xl font-semibold text-primary">1.3M+</div>
            <div className="text-muted-foreground">{isChinese ? "法律案例" : "Legal cases"}</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-primary">13</div>
            <div className="text-muted-foreground">{isChinese ? "涵蓋法院" : "Courts covered"}</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-primary">EN/TC</div>
            <div className="text-muted-foreground">{isChinese ? "雙語支持" : "Bilingual"}</div>
          </div>
        </div>

        {/* Examples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examples.map((example, i) => (
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
          {isChinese
            ? "Casebird 僅提供法律研究輔助。請務必核實案例引用，並就法律建議諮詢合資格的法律顧問。"
            : "Casebird provides legal research assistance only. Always verify case citations and consult qualified legal counsel for legal advice."}
        </p>
        </div>
      </div>
    </div>
  );
}
