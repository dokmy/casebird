// Cap 282 — Employees' Compensation Ordinance (僱員補償條例)
// Section definitions with search keywords for Pinecone annotation generation
// Source of truth: HKLII API (getcapversiontoc, EN id=52034, ZH id=52035)

import type { SectionDefinition } from "./cap57-sections";

export const CAP282_METADATA = {
  capNumber: 282,
  titleEn: "Employees' Compensation Ordinance",
  titleZh: "僱員補償條例",
  shortCitation: "Cap. 282",
  enactedYear: 1953,
  lastAmended: "2026",
  elegislationUrl: "https://www.elegislation.gov.hk/hk/cap282",
  hkliiUrl: "https://www.hklii.hk/en/legis/ord/282/",
};

export const CAP282_SECTIONS: SectionDefinition[] = [
  // Part I — Preliminary
  {
    section: "2",
    titleEn: "Meaning of employee",
    titleZh: "僱員的涵義",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 2 employees compensation ordinance meaning employee",
      "who is employee employees compensation cap 282 definition",
      "contract of service employees compensation ordinance scope",
      "僱員補償條例 第2條 僱員涵義 定義",
    ],
    summary:
      "Defines 'employee' for the purposes of the Ordinance, covering any person who has entered into or works under a contract of service or apprenticeship.",
  },
  {
    section: "3",
    titleEn: "Interpretation",
    titleZh: "釋義",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 3 employees compensation ordinance interpretation",
      "employees compensation ordinance definition terms cap 282",
      "incapacity earnings compensation definition cap 282",
      "僱員補償條例 第3條 釋義 定義",
    ],
    summary:
      "Defines key terms including 'compensation', 'incapacity', 'earnings', 'medical treatment', 'the Commissioner', and 'the Court'.",
  },
  {
    section: "4",
    titleEn: "Application to certain employees",
    titleZh: "對某些僱員的適用範圍",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 4 employees compensation ordinance application certain employees",
      "employees compensation ordinance family member domestic servant",
      "cap 282 application scope excluded employees",
      "僱員補償條例 第4條 適用範圍 某些僱員",
    ],
    summary:
      "Extends the application of the Ordinance to certain categories of employees, including outworkers and family members employed in the employer's trade or business.",
  },

  // Part II — Compensation for Injury
  {
    section: "5",
    titleEn:
      "Employer's liability for compensation for death or incapacity resulting from accident",
    titleZh: "僱主就意外引致僱員死亡或喪失工作能力而支付補償的法律責任",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 5 employees compensation ordinance employer liability accident",
      "personal injury accident arising out of course employment cap 282",
      "employer liable compensation work injury no fault Hong Kong",
      "僱員補償條例 第5條 僱主法律責任 工傷意外",
      "arising out of and in the course of employment employees compensation",
    ],
    summary:
      "The core liability provision. An employer is liable to pay compensation if an employee suffers personal injury by accident arising out of and in the course of employment, regardless of fault.",
  },
  {
    section: "6",
    titleEn: "Compensation in fatal cases",
    titleZh: "致命個案的補償",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 6 employees compensation fatal cases death",
      "compensation death employee work accident amount cap 282",
      "fatal injury compensation dependants employees ordinance",
      "僱員補償條例 第6條 致命個案 死亡補償",
    ],
    summary:
      "Sets out compensation payable in fatal work injury cases. The amount is calculated as a multiple of the deceased employee's monthly earnings, subject to minimum and maximum amounts depending on age.",
  },
  {
    section: "6A",
    titleEn: "Apportionment of compensation",
    titleZh: "補償的分配",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 6A employees compensation apportionment dependants",
      "apportionment compensation fatal case dependants cap 282",
      "distribution compensation death family members employees compensation",
      "僱員補償條例 第6A條 補償分配 受養人",
    ],
    summary:
      "Governs how compensation in fatal cases is apportioned among the deceased employee's family members and dependants.",
  },
  {
    section: "7",
    titleEn: "Compensation in case of permanent total incapacity",
    titleZh: "永久地完全喪失工作能力方面的補償",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 7 employees compensation permanent total incapacity",
      "permanent total incapacity compensation amount cap 282",
      "100 percent loss earning capacity employees compensation",
      "僱員補償條例 第7條 永久完全喪失工作能力 補償",
    ],
    summary:
      "Prescribes compensation for permanent total incapacity (100% loss of earning capacity). The amount is a multiple of monthly earnings, subject to minimum and maximum amounts depending on age.",
  },
  {
    section: "9",
    titleEn: "Compensation in case of permanent partial incapacity",
    titleZh: "永久地部分喪失工作能力方面的補償",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 9 employees compensation permanent partial incapacity",
      "permanent partial incapacity percentage loss earning capacity cap 282",
      "first schedule percentage loss earning capacity employees compensation",
      "僱員補償條例 第9條 永久部分喪失工作能力 補償百分比",
    ],
    summary:
      "Prescribes compensation for permanent partial incapacity, calculated as a percentage of the permanent total incapacity amount corresponding to the assessed percentage of loss of earning capacity.",
  },
  {
    section: "10",
    titleEn: "Compensation in case of temporary incapacity",
    titleZh: "暫時喪失工作能力方面的補償",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 10 employees compensation temporary incapacity periodical payments",
      "temporary incapacity periodical payments four fifths earnings cap 282",
      "sick leave payments work injury employees compensation",
      "僱員補償條例 第10條 暫時喪失工作能力 按期付款",
    ],
    summary:
      "An employee suffering temporary incapacity is entitled to periodical payments at four-fifths of the difference between pre-accident and post-accident earnings, for the period of incapacity.",
  },
  {
    section: "10A",
    titleEn: "Payment of medical expenses",
    titleZh: "醫療費的支付",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 10A employees compensation medical expenses payment",
      "medical expenses work injury employer liability cap 282",
      "employer pay medical costs employees compensation ordinance",
      "僱員補償條例 第10A條 醫療費 支付",
    ],
    summary:
      "The employer is liable to pay the medical expenses reasonably incurred by the employee as a result of the work injury, subject to prescribed limits.",
  },
  {
    section: "11",
    titleEn: "Method of calculating earnings",
    titleZh: "計算收入的方法",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 11 employees compensation calculating earnings method",
      "monthly earnings calculation employees compensation cap 282",
      "how calculate earnings employees compensation overtime allowances",
      "僱員補償條例 第11條 計算收入 方法 月入",
    ],
    summary:
      "Prescribes how monthly earnings are calculated for compensation purposes, including treatment of overtime, allowances, tips, and bonuses.",
  },
  {
    section: "14",
    titleEn:
      "Requirements as to notice of accident and application for compensation",
    titleZh: "關於意外通知和補償申請的規定",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 14 employees compensation notice accident time limit",
      "notice of accident application compensation time limit cap 282",
      "failure give notice accident employees compensation bar claim",
      "僱員補償條例 第14條 意外通知 時限 補償申請",
    ],
    summary:
      "Sets time limits for giving notice of an accident and making an application for compensation. Failure to give notice does not bar the claim if the employer had knowledge of the accident.",
  },
  {
    section: "15",
    titleEn:
      "Employer to report the injury to or death of an employee and method of notification",
    titleZh: "由僱主呈報僱員傷亡以及通知方法",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 15 employees compensation employer report injury death",
      "employer report work accident commissioner labour cap 282",
      "form 2 employer report accident employees compensation",
      "僱員補償條例 第15條 僱主呈報 傷亡",
    ],
    summary:
      "The employer must report any work accident causing injury or death to the Commissioner for Labour within prescribed time limits. Failure to report is a criminal offence.",
  },
  {
    section: "16",
    titleEn: "Medical examination and treatment",
    titleZh: "身體檢查及治療",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 16 employees compensation medical examination treatment",
      "medical examination employee work injury cap 282",
      "employer require medical examination employees compensation",
      "僱員補償條例 第16條 身體檢查 治療",
    ],
    summary:
      "An employee claiming compensation must submit to medical examination if required by the employer. Unreasonable refusal may suspend the right to compensation.",
  },
  {
    section: "16A",
    titleEn: "Determination of claims in respect of injuries",
    titleZh: "有關損傷的申索的裁定",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 16A employees compensation determination claims injuries",
      "commissioner determine claim compensation cap 282",
      "injuries claim certificate employees compensation",
      "僱員補償條例 第16A條 損傷申索 裁定",
    ],
    summary:
      "The Commissioner may issue a certificate determining the employer's liability to pay compensation in respect of an employee's injuries.",
  },
  {
    section: "16F",
    titleEn: "Certificates of assessment",
    titleZh: "評估證明書",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 16F employees compensation certificate assessment",
      "assessment board certificate loss earning capacity cap 282",
      "employees compensation assessment board percentage incapacity",
      "僱員補償條例 第16F條 評估證明書 喪失工作能力",
    ],
    summary:
      "The Employees' Compensation Assessment Board issues certificates stating the nature and degree of permanent incapacity, which form the basis for calculating compensation.",
  },
  {
    section: "16G",
    titleEn: "Review of assessments",
    titleZh: "評估的審核",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 16G employees compensation review assessment",
      "review assessment certificate employees compensation cap 282",
      "appeal challenge assessment board decision employees compensation",
      "僱員補償條例 第16G條 審核評估 覆檢",
    ],
    summary:
      "Either party may apply for a review of the Assessment Board's certificate within specified time limits if there has been a change of circumstances or the assessment was based on inadequate information.",
  },
  {
    section: "18",
    titleEn: "Appeals to the Court",
    titleZh: "向法院上訴",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 18 employees compensation appeal court",
      "appeal against commissioner determination employees compensation cap 282",
      "appeal district court employees compensation ordinance",
      "僱員補償條例 第18條 上訴 法院",
    ],
    summary:
      "A party aggrieved by a determination of the Commissioner may appeal to the District Court within a prescribed time limit.",
  },
  {
    section: "24",
    titleEn: "Liability in case of employees employed by sub-contractors",
    titleZh: "在僱員受僱於次承判商情況下的法律責任",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 24 employees compensation sub-contractor principal contractor",
      "sub-contractor liability employees compensation cap 282",
      "principal contractor liable sub-contractor employee work injury",
      "僱員補償條例 第24條 次承判商 判頭 法律責任",
    ],
    summary:
      "Where an employer (principal) contracts out work to a sub-contractor, the principal is liable for compensation to the sub-contractor's employees as if they were directly employed by the principal.",
  },
  {
    section: "25",
    titleEn: "Remedies against both employer and third party",
    titleZh: "針對僱主及第三者可得的補救辦法",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 25 employees compensation remedies employer third party",
      "third party claim employees compensation cap 282",
      "employer indemnity third party work injury employees compensation",
      "僱員補償條例 第25條 第三者 僱主 補救辦法",
    ],
    summary:
      "Where a work injury is caused by a third party's negligence, the employee may claim both statutory compensation from the employer and common law damages from the third party, but cannot recover double compensation.",
  },
  {
    section: "26",
    titleEn: "Remedies independently of Ordinance against employer",
    titleZh: "在不涉及本條例下針對僱主可得的補救辦法",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 26 employees compensation common law election employer",
      "election statutory compensation common law damages cap 282",
      "common law claim employer negligence employees compensation",
      "僱員補償條例 第26條 普通法 僱主 選擇",
    ],
    summary:
      "An employee may pursue a common law damages claim against the employer independently of statutory compensation, but common law damages are reduced by any statutory compensation received.",
  },
  {
    section: "31",
    titleEn: "Contracting out",
    titleZh: "訂立本條例不適用的條款",
    part: "II",
    partTitleEn: "Compensation for Injury",
    partTitleZh: "損傷的補償",
    searchQueries: [
      "section 31 employees compensation contracting out void",
      "contracting out employees compensation ordinance prohibited cap 282",
      "employer cannot contract out employees compensation void",
      "僱員補償條例 第31條 訂約不適用 無效",
    ],
    summary:
      "Any contract or agreement that purports to remove or reduce an employee's right to compensation under the Ordinance is void.",
  },

  // Part III — Compensation for Occupational Diseases
  {
    section: "32",
    titleEn: "Compensation in the case of occupational disease",
    titleZh: "職業病方面的補償",
    part: "III",
    partTitleEn: "Compensation for Occupational Diseases",
    partTitleZh: "職業病的補償",
    searchQueries: [
      "section 32 employees compensation occupational disease",
      "occupational disease compensation second schedule cap 282",
      "prescribed occupational disease employer liability employees compensation",
      "僱員補償條例 第32條 職業病 補償",
    ],
    summary:
      "An employee who contracts a prescribed occupational disease (listed in the Second Schedule) due to the nature of their employment is entitled to compensation as if injured by accident.",
  },
  {
    section: "34",
    titleEn: "Presumption as to cause of occupational disease",
    titleZh: "關於職業病病因的推定",
    part: "III",
    partTitleEn: "Compensation for Occupational Diseases",
    partTitleZh: "職業病的補償",
    searchQueries: [
      "section 34 employees compensation presumption occupational disease",
      "presumption occupational disease caused employment cap 282",
      "burden proof occupational disease employees compensation",
      "僱員補償條例 第34條 職業病 推定 病因",
    ],
    summary:
      "Where an employee is employed in an occupation listed in the Second Schedule and contracts the corresponding disease, it is presumed that the disease was due to the nature of the employment.",
  },
  {
    section: "36",
    titleEn: "Saving in case of diseases other than occupational diseases",
    titleZh: "關於非職業病的疾病的保留條文",
    part: "III",
    partTitleEn: "Compensation for Occupational Diseases",
    partTitleZh: "職業病的補償",
    searchQueries: [
      "section 36 employees compensation saving diseases non-occupational",
      "disease not prescribed occupational disease employees compensation cap 282",
      "non-occupational disease work injury claim employees compensation",
      "僱員補償條例 第36條 非職業病 保留條文",
    ],
    summary:
      "A disease not listed as a prescribed occupational disease may still be compensable under s.5 if it constitutes a personal injury by accident arising out of and in the course of employment.",
  },

  // Part IIIA — Prostheses and Surgical Appliances
  {
    section: "36B",
    titleEn:
      "Employer's liability to pay for the cost of supplying and fitting prosthesis or surgical appliance",
    titleZh: "僱主支付供應和裝配義製人體器官或外科器具的費用的法律責任",
    part: "IIIA",
    partTitleEn: "Prostheses and Surgical Appliances",
    partTitleZh: "義製人體器官及外科器具",
    searchQueries: [
      "section 36B employees compensation prosthesis surgical appliance",
      "employer pay prosthesis surgical appliance work injury cap 282",
      "prostheses appliances employer liability employees compensation",
      "僱員補償條例 第36B條 義製人體器官 外科器具 費用",
    ],
    summary:
      "The employer is liable to pay for the cost of supplying and fitting any prosthesis or surgical appliance reasonably required as a result of the work injury.",
  },

  // Part IV — Compulsory Insurance
  {
    section: "40",
    titleEn: "Compulsory insurance against employer's liability",
    titleZh: "對僱主的法律責任承保的強制保險",
    part: "IV",
    partTitleEn: "Compulsory Insurance",
    partTitleZh: "強制保險",
    searchQueries: [
      "section 40 employees compensation compulsory insurance employer",
      "employer must insure employees compensation liability cap 282",
      "failure insure employees compensation offence penalty",
      "僱員補償條例 第40條 強制保險 僱主",
    ],
    summary:
      "Every employer must maintain an insurance policy with an approved insurer covering liability under the Ordinance. Failure to insure is a criminal offence punishable by fine and imprisonment.",
  },
  {
    section: "40A",
    titleEn: "Mandatory information in policy",
    titleZh: "載於保險單內的強制性資料",
    part: "IV",
    partTitleEn: "Compulsory Insurance",
    partTitleZh: "強制保險",
    searchQueries: [
      "section 40A employees compensation mandatory information insurance policy",
      "insurance policy requirements employees compensation cap 282",
      "mandatory information insurance policy employees compensation",
      "僱員補償條例 第40A條 保險單 強制性資料",
    ],
    summary:
      "Prescribes mandatory information that must be included in every employees' compensation insurance policy.",
  },
  {
    section: "42",
    titleEn: "Insurer's liability",
    titleZh: "保險人的法律責任",
    part: "IV",
    partTitleEn: "Compulsory Insurance",
    partTitleZh: "強制保險",
    searchQueries: [
      "section 42 employees compensation insurer liability",
      "insurer liability employees compensation cap 282",
      "insurance company liability work injury employees compensation",
      "僱員補償條例 第42條 保險人 法律責任",
    ],
    summary:
      "Defines the scope of the insurer's liability under an employees' compensation insurance policy.",
  },
  {
    section: "44",
    titleEn: "Right of injured party to proceed against insurer",
    titleZh: "受損的一方對保險人進行法律程序的權利",
    part: "IV",
    partTitleEn: "Compulsory Insurance",
    partTitleZh: "強制保險",
    searchQueries: [
      "section 44 employees compensation injured party proceed insurer",
      "employee proceed directly against insurer cap 282",
      "direct action insurer employees compensation employer insolvent",
      "僱員補償條例 第44條 直接向保險人索償 法律程序",
    ],
    summary:
      "Where the employer is insolvent or cannot be found, the injured employee may proceed directly against the insurer to recover compensation.",
  },
  {
    section: "48",
    titleEn:
      "Contract of service not to be terminated during incapacity",
    titleZh: "僱用合約不得在僱員喪失工作能力期間被終止",
    part: "V",
    partTitleEn: "Miscellaneous",
    partTitleZh: "雜項",
    searchQueries: [
      "section 48 employees compensation contract not terminated incapacity",
      "employer cannot dismiss employee during incapacity cap 282",
      "termination employment during work injury incapacity employees compensation",
      "僱員補償條例 第48條 合約不得終止 喪失工作能力期間",
    ],
    summary:
      "An employer must not terminate the contract of service of an employee who is absent from work due to incapacity caused by a work injury. Dismissal during incapacity is an offence.",
  },
  {
    section: "46",
    titleEn: "Compensation not to be assigned, charged or attached",
    titleZh: "補償不能予以轉讓、押記或扣押",
    part: "V",
    partTitleEn: "Miscellaneous",
    partTitleZh: "雜項",
    searchQueries: [
      "section 46 employees compensation not assignable attached",
      "compensation not assignable charged attached cap 282",
      "cannot assign employees compensation bankruptcy",
      "僱員補償條例 第46條 不得轉讓 押記 扣押",
    ],
    summary:
      "Compensation under the Ordinance cannot be assigned, charged, or attached, and does not pass to any trustee in bankruptcy.",
  },
];
