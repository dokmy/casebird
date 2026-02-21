"use client";

import { useState } from "react";
import { Shield, Gavel, Building2, Briefcase, FileCheck, HardHat, Car, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatherIcon } from "@/components/ui/feather-icon";
import type { UserRole } from "@/types/chat";

interface WelcomeScreenProps {
  onExampleClick: (query: string) => void;
  outputLanguage?: "EN" | "TC";
  userRole?: UserRole;
}

// --- Insurance role: 3 PI-focused categories ---

const INSURANCE_FIELDS = [
  { id: "workplace", label: "Workplace Injury", labelTC: "工傷", icon: HardHat },
  { id: "traffic", label: "Traffic Accident", labelTC: "交通意外", icon: Car },
  { id: "quantum", label: "Quantum Assessment", labelTC: "賠償評估", icon: Calculator },
] as const;

const INSURANCE_QUERIES: Record<string, { EN: { title: string; query: string }[]; TC: { title: string; query: string }[] }> = {
  workplace: {
    EN: [
      {
        title: "Construction fall — spinal fracture",
        query: "A 45-year-old construction worker fell from scaffolding and fractured his lumbar spine. He can no longer do manual labour. What are the comparable PSLA and loss of earning capacity awards?",
      },
      {
        title: "Factory machine — hand amputation",
        query: "A factory worker lost three fingers in a pressing machine due to inadequate safety guards. What quantum awards have Hong Kong courts given for partial hand amputation in workplace accidents?",
      },
      {
        title: "Slip and fall — knee injury",
        query: "A restaurant worker slipped on a wet kitchen floor and tore her ACL, requiring surgery. What are the comparable awards for knee ligament injuries in workplace slip and fall cases?",
      },
    ],
    TC: [
      {
        title: "建築工人墮下 — 脊椎骨折",
        query: "一名45歲建築工人從棚架墮下，腰椎骨折，無法再從事體力勞動。有哪些類似的痛楚及喪失生活樂趣賠償和喪失謀生能力的案例？",
      },
      {
        title: "工廠機器 — 手指截斷",
        query: "一名工廠工人因安全防護裝置不足，在壓機中失去三根手指。香港法院在工傷案件中對部分手掌截斷判了多少賠償？",
      },
      {
        title: "滑倒受傷 — 膝蓋韌帶",
        query: "一名餐廳員工在濕滑的廚房地面滑倒，前十字韌帶撕裂需要手術。工傷滑倒案件中膝蓋韌帶受傷的類似賠償金額是多少？",
      },
    ],
  },
  traffic: {
    EN: [
      {
        title: "Rear-end collision — whiplash",
        query: "A 35-year-old office worker suffered whiplash and chronic neck pain after a rear-end collision. What are the typical PSLA awards for whiplash injuries in Hong Kong traffic accident cases?",
      },
      {
        title: "Pedestrian hit — multiple fractures",
        query: "A pedestrian was hit by a minibus while crossing at a zebra crossing, suffering a broken pelvis and femur. What are the comparable quantum awards and was contributory negligence applied?",
      },
      {
        title: "Motorcycle accident — brain injury",
        query: "A motorcyclist suffered a traumatic brain injury after a collision with a truck. What are the quantum awards for TBI in Hong Kong traffic accidents, including future care costs?",
      },
    ],
    TC: [
      {
        title: "追尾碰撞 — 鞭打症",
        query: "一名35歲文職人員在追尾碰撞中受傷，出現鞭打症和慢性頸痛。香港交通意外案件中鞭打症的典型痛楚賠償金額是多少？",
      },
      {
        title: "行人被撞 — 多處骨折",
        query: "一名行人在斑馬線上被小巴撞倒，盆骨和股骨骨折。類似的賠償金額是多少？有沒有判定共同疏忽？",
      },
      {
        title: "電單車意外 — 腦創傷",
        query: "一名電單車司機與貨車碰撞後遭受創傷性腦損傷。香港交通意外中腦創傷的賠償金額是多少，包括未來護理費用？",
      },
    ],
  },
  quantum: {
    EN: [
      {
        title: "Pre-existing condition — reduced award",
        query: "Find Hong Kong PI cases where the plaintiff had a pre-existing back condition and the court reduced the PSLA award. What discount percentages were applied?",
      },
      {
        title: "Failure to mitigate — refused surgery",
        query: "What are the Hong Kong cases where a plaintiff's PSLA award was reduced because they unreasonably refused recommended surgery or treatment?",
      },
      {
        title: "Surveillance evidence — exaggeration",
        query: "Find Hong Kong PI cases where surveillance evidence showed the plaintiff exaggerated their injuries. How did the court adjust the quantum?",
      },
    ],
    TC: [
      {
        title: "既往病史 — 減少賠償",
        query: "搜尋香港人身傷害案件中原告有舊患（腰背傷），法庭因此減少痛楚賠償的案例。折扣百分比是多少？",
      },
      {
        title: "未減低損失 — 拒絕手術",
        query: "有哪些香港案例中原告因不合理拒絕建議的手術或治療而被減少痛楚賠償？",
      },
      {
        title: "監控證據 — 誇大傷勢",
        query: "搜尋香港人身傷害案件中監控證據顯示原告誇大傷勢的案例。法庭如何調整賠償金額？",
      },
    ],
  },
};

// --- Lawyer role: 5 general categories ---

const LAWYER_FIELDS = [
  { id: "criminal", label: "Criminal", labelTC: "刑事", icon: Gavel },
  { id: "pi", label: "Personal Injury", labelTC: "人身傷害", icon: Shield },
  { id: "corporate", label: "Corporate", labelTC: "公司法", icon: Building2 },
  { id: "inhouse", label: "In-house", labelTC: "企業法務", icon: Briefcase },
  { id: "insurance", label: "Insurance", labelTC: "保險", icon: FileCheck },
] as const;

const LAWYER_QUERIES: Record<string, { EN: { title: string; query: string }[]; TC: { title: string; query: string }[] }> = {
  criminal: {
    EN: [
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
    TC: [
      {
        title: "危險駕駛判刑",
        query: "根據香港《道路交通條例》第36條，危險駕駛引致死亡的判刑指引和近期判例是什麼？",
      },
      {
        title: "詐騙案保釋條件",
        query: "香港法院在大型商業詐騙案中施加了哪些保釋條件？考慮了哪些因素？",
      },
      {
        title: "三合會相關罪行判刑",
        query: "搜尋香港《有組織及嚴重罪行條例》（第455章）下與三合會相關活動的近期判刑先例。",
      },
    ],
  },
  pi: {
    EN: [
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
    TC: [
      {
        title: "肩傷痛楚賠償",
        query: "搜尋香港人身傷害案件中原告肩袖撕裂、痛楚及喪失生活樂趣賠償在港幣200,000至500,000之間的案例。",
      },
      {
        title: "年輕原告喪失謀生能力",
        query: "香港法院如何評估30歲以下在工傷中永久傷殘的原告的未來謀生能力損失？",
      },
      {
        title: "交通意外共同疏忽",
        query: "搜尋香港案例中行人被車輛撞倒時共同疏忽的評估，以及適用的扣減百分比。",
      },
    ],
  },
  corporate: {
    EN: [
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
    TC: [
      {
        title: "董事違反信託責任",
        query: "香港法院對董事違反信託責任的個人責任標準是什麼？法院判了哪些補救措施？",
      },
      {
        title: "不公平損害呈請",
        query: "搜尋香港《公司條例》第724條下不公平損害呈請的案例。法院認為哪些行為對少數股東構成不公平損害？",
      },
      {
        title: "股東衍生訴訟",
        query: "在香港根據《公司條例》第14部第4分部提起法定衍生訴訟的要求是什麼？",
      },
    ],
  },
  inhouse: {
    EN: [
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
    TC: [
      {
        title: "內部法律顧問的法律專業保密權",
        query: "香港法院如何處理與內部律師通訊的法律專業保密權？與外部律師相比有什麼限制？",
      },
      {
        title: "僱傭競業禁止條款",
        query: "搜尋香港案例中僱傭合約競業禁止條款的可執行性。什麼因素使限制貿易條款合理？",
      },
      {
        title: "數據私隱違規責任",
        query: "根據香港《個人資料（私隱）條例》，遭受資料外洩的公司有什麼法律後果？私隱專員採取了哪些執法行動？",
      },
    ],
  },
  insurance: {
    EN: [
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
    TC: [
      {
        title: "人身傷害索賠詐騙",
        query: "搜尋香港案例中因監控證據顯示誇大或詐騙而駁回或減少人身傷害索賠的案例。",
      },
      {
        title: "保險人彌償責任",
        query: "搜尋香港案例中保險人以被保險人未披露或失實陳述為由爭議彌償責任的案例。",
      },
      {
        title: "代位權爭議",
        query: "香港法院如何處理保險人代位權的爭議，特別是被保險人已與侵權人和解的情況？",
      },
    ],
  },
};

export function WelcomeScreen({ onExampleClick, outputLanguage = "EN", userRole = "lawyer" }: WelcomeScreenProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const isChinese = outputLanguage === "TC";

  const isInsurance = userRole === "insurance";
  const fields = isInsurance ? INSURANCE_FIELDS : LAWYER_FIELDS;
  const queries = isInsurance ? INSURANCE_QUERIES : LAWYER_QUERIES;
  const samples = activeField ? (queries[activeField]?.[outputLanguage] || []) : [];

  return (
    <div className="w-full max-w-2xl mx-auto text-center px-4">
      {/* Logo & branding */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
          <FeatherIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground">Casebird</h1>
        <p className="font-serif text-muted-foreground mt-1.5 text-sm sm:text-base">
          {isInsurance
            ? (isChinese ? "搜尋相似案例，評估賠償金額" : "Find comparable cases and assess compensation quantum")
            : (isChinese ? "搜尋 200,000+ 香港法律案例" : "Search 200,000+ Hong Kong legal cases instantly")}
        </p>
      </div>

      {/* Field chips */}
      <div className="mb-4">
        <p className="text-xs font-serif text-muted-foreground mb-2">
          {isChinese ? "選擇領域查看示例查詢" : "Try a sample enquiry"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {fields.map((field) => (
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
              {isChinese ? field.labelTC : field.label}
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
