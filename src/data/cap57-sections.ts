// Cap 57 — Employment Ordinance (僱傭條例)
// Section definitions with search keywords for Pinecone annotation generation
// Source of truth: HKLII API (getcapversiontoc, EN id=52124, ZH id=52125)

export interface SectionDefinition {
  section: string; // e.g. "9", "31I", "72B"
  titleEn: string;
  titleZh: string;
  part: string;
  partTitleEn: string;
  partTitleZh: string;
  searchQueries: string[]; // Tailored queries for Pinecone (EN + CN)
  sectionText?: string; // Actual statutory text (added after scraping)
  summary?: string; // Plain language summary
}

export const CAP57_METADATA = {
  capNumber: 57,
  titleEn: "Employment Ordinance",
  titleZh: "僱傭條例",
  shortCitation: "Cap. 57",
  enactedYear: 1968,
  lastAmended: "2024",
  elegislationUrl: "https://www.elegislation.gov.hk/hk/cap57",
  hkliiUrl: "https://www.hklii.hk/en/legis/ord/57/",
};

export const CAP57_SECTIONS: SectionDefinition[] = [
  // Part I — Preliminary
  {
    section: "2",
    titleEn: "Interpretation",
    titleZh: "釋義",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 2 employment ordinance definition",
      "employee independent contractor employment ordinance",
      "definition wages employment ordinance cap 57",
      "僱傭條例 僱員定義 獨立承判商",
      "who is employee employment ordinance Hong Kong",
    ],
    summary:
      "Defines key terms including 'employee', 'employer', 'wages', and 'contract of employment'. Central to disputes about whether a person is an employee or independent contractor.",
  },
  {
    section: "4",
    titleEn: "Application of Ordinance",
    titleZh: "本條例的適用範圍",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 4 employment ordinance application scope",
      "employment ordinance exclusion domestic helper",
      "employment ordinance does not apply",
      "僱傭條例 適用範圍 豁免",
    ],
    summary:
      "Specifies who the Ordinance applies to and any exclusions. Domestic helpers, seamen, and family members of the employer are covered with some modifications.",
  },

  // Part II — Contracts of Employment
  {
    section: "6",
    titleEn: "Termination of contract by notice",
    titleZh: "以通知終止合約的情況",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 6 employment ordinance termination contract notice",
      "termination notice employment ordinance section 6",
      "implied terms employment contract Hong Kong termination",
      "employer right terminate giving notice cap 57",
      "僱傭條例 第6條 終止合約 通知",
    ],
    summary:
      "Gives both employer and employee the right to terminate a contract of employment by giving notice. The notice period may be specified in the contract or defaults to the statutory minimum.",
  },
  {
    // NOTE: s.6A does not exist in the Employment Ordinance. "Continuous contract"
    // is defined in s.3 (Meaning of continuous contract) + First Schedule.
    // We keep "6A" as a user-facing label because that's what practitioners commonly search for.
    section: "6A",
    titleEn: "Continuous contract",
    titleZh: "連續性合約",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 6A continuous contract employment ordinance",
      "418 rule four weeks eighteen hours employment",
      "continuous contract definition Hong Kong",
      "連續性合約 僱傭條例 418規則",
      "continuous employment four weeks employee cap 57",
    ],
    summary:
      "The '418 rule': an employee is regarded as employed under a continuous contract if they work for the same employer for 4 weeks or more, with at least 18 hours per week.",
  },
  {
    section: "7",
    titleEn: "Termination of contract by payment in lieu of notice",
    titleZh: "以代通知金終止合約的情況",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 7 employment ordinance termination",
      "payment lieu notice termination employment",
      "termination contract notice period cap 57",
      "wrongful termination employment ordinance damages",
      "僱傭條例 第7條 終止合約 代通知金",
    ],
    summary:
      "Governs how employment contracts may be terminated, including the required notice period or payment in lieu of notice.",
  },
  {
    section: "9",
    titleEn: "Termination of contract without notice by employer",
    titleZh: "僱主不給予通知而終止合約的情況",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 9 summary dismissal employment ordinance",
      "summary dismissal misconduct wilful disobedience",
      "employer dismiss without notice Hong Kong",
      "即時解僱 嚴重過失 僱傭條例 第9條",
      "grounds summary dismissal employee fraud",
    ],
    summary:
      "Allows an employer to summarily dismiss an employee without notice for wilful disobedience, misconduct, fraud, dishonesty, or habitual neglect of duty.",
  },
  {
    section: "10",
    titleEn: "Termination of contract without notice by employee",
    titleZh: "僱員不給予通知而終止合約的情況",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 10 employment ordinance employee terminate without notice",
      "employee terminate without notice violence ill-treatment",
      "employer fail pay wages employee leave cap 57",
      "僱傭條例 第10條 僱員終止合約 無須通知",
      "fear violence disease employee terminate employment",
    ],
    summary:
      "Allows an employee to terminate the contract without notice if the employer fails to pay wages, the employee reasonably fears physical danger by violence or disease, or is subjected to ill-treatment.",
  },

  // Part III — Protection of Wages
  {
    section: "21",
    titleEn: "Void conditions",
    titleZh: "無效條件",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 21 employment ordinance void conditions rest day",
      "void conditions employment contract cap 57",
      "僱傭條例 第21條 無效條件",
    ],
    summary:
      "Conditions in a contract of employment that are inconsistent with the provisions of Part IV (rest days) are void.",
  },
  {
    section: "22",
    titleEn: "Wage period",
    titleZh: "工資期",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 22 employment ordinance wage period",
      "wage period one month employment ordinance cap 57",
      "僱傭條例 第22條 工資期",
    ],
    summary:
      "The wage period must not exceed one month. If not specified in the contract, the wage period is one month.",
  },
  {
    section: "23",
    titleEn: "Time of payment of wages",
    titleZh: "工資的支付日期",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 23 employment ordinance time payment wages",
      "wages payment deadline seven days cap 57",
      "employer late payment wages employment ordinance",
      "工資支付日期 僱傭條例 第23條",
      "when must employer pay wages Hong Kong",
    ],
    summary:
      "Wages become due on expiry of the last day of the wage period, and must be paid as soon as practicable but no later than 7 days after.",
  },
  {
    section: "25",
    titleEn: "Payment on termination",
    titleZh: "僱傭合約終止時的工資支付",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 25 employment ordinance payment termination",
      "wages payment on termination seven days cap 57",
      "employer pay wages termination employment ordinance",
      "僱傭條例 第25條 終止時工資支付",
    ],
    summary:
      "When a contract of employment is terminated, all wages earned must be paid as soon as practicable but no later than 7 days after the date of termination.",
  },
  {
    section: "32",
    titleEn: "Restriction on deductions from wages",
    titleZh: "扣除工資的限制",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 32 employment ordinance restriction deduction wages",
      "unlawful deduction wages employer cap 57",
      "employer deduct salary absence damage negligence",
      "扣除工資限制 僱傭條例 第32條",
      "permitted deductions wages employment Hong Kong",
    ],
    summary:
      "Restricts the types of deductions an employer may make from wages. Only specific deductions (e.g. for absence, damage due to negligence) are permitted, and total deductions must not exceed half the wages payable.",
  },

  // Part IV — Rest Days
  {
    section: "17",
    titleEn: "Grant of rest days",
    titleZh: "休息日的給予",
    part: "IV",
    partTitleEn: "Rest Days",
    partTitleZh: "休息日",
    searchQueries: [
      "section 17 employment ordinance rest day",
      "rest day entitlement weekly employment cap 57",
      "employer compel work rest day employment ordinance",
      "休息日 僱傭條例 第17條 每星期",
      "employee right day off per week Hong Kong",
    ],
    summary:
      "An employee employed under a continuous contract is entitled to not less than 1 rest day in every period of 7 days.",
  },

  // Part VA — Severance Payments
  {
    section: "31B",
    titleEn: "General provisions as to right to severance payment",
    titleZh: "關於領取遣散費權利的一般條文",
    part: "VA",
    partTitleEn: "Severance Payments",
    partTitleZh: "遣散費",
    searchQueries: [
      "section 31B employment ordinance severance payment",
      "severance payment entitlement redundancy laid off",
      "employee dismissed redundancy severance cap 57",
      "遣散費 裁員 僱傭條例 第31B條",
      "conditions qualify severance payment Hong Kong",
    ],
    summary:
      "An employee under a continuous contract for 24 months or more is entitled to severance payment if dismissed by reason of redundancy or laid off.",
  },
  {
    section: "31G",
    titleEn: "Amount of severance payment",
    titleZh: "遣散費的款額",
    part: "VA",
    partTitleEn: "Severance Payments",
    partTitleZh: "遣散費",
    searchQueries: [
      "section 31G employment ordinance severance calculation",
      "severance payment formula two thirds wages",
      "calculate severance payment years service cap 57",
      "遣散費計算 款額 僱傭條例 第31G條",
    ],
    summary:
      "Sets out the formula for calculating severance payment: 2/3 of the last month's wages × years of service (subject to a statutory cap).",
  },
  {
    section: "31I",
    titleEn:
      "Severance payment to be reduced by amount of gratuities and benefits in certain cases",
    titleZh: "在某些情況下，遣散費須扣除酬金及利益或權益的款額",
    part: "VA",
    partTitleEn: "Severance Payments",
    partTitleZh: "遣散費",
    searchQueries: [
      "section 31I employment ordinance severance reduction",
      "severance payment offset MPF employer contribution",
      "reduce severance gratuity retirement benefit",
      "遣散費扣減 強積金 僱傭條例 第31I條",
      "offset severance long service MPF Hong Kong",
    ],
    summary:
      "Severance payment may be reduced by gratuities, retirement scheme benefits, or MPF employer contributions already received by the employee.",
  },

  // Part VB — Long Service Payments
  {
    section: "31R",
    titleEn:
      "General provisions as to employee's right to long service payment",
    titleZh: "僱員領取長期服務金權利的一般條文",
    part: "VB",
    partTitleEn: "Long Service Payments",
    partTitleZh: "長期服務金",
    searchQueries: [
      "section 31R employment ordinance long service payment",
      "long service payment five years entitlement",
      "employee dismissed long service payment cap 57",
      "長期服務金 五年 僱傭條例 第31R條",
      "qualify long service payment retirement Hong Kong",
    ],
    summary:
      "An employee under a continuous contract for 5 years or more is entitled to long service payment upon dismissal (other than for cause), death, or retirement.",
  },
  {
    section: "31RA",
    titleEn: "Death of employee",
    titleZh: "僱員的死亡",
    part: "VB",
    partTitleEn: "Long Service Payments",
    partTitleZh: "長期服務金",
    searchQueries: [
      "section 31RA employment ordinance death employee long service",
      "long service payment death employee cap 57",
      "employee dies long service payment personal representative",
      "僱傭條例 第31RA條 僱員死亡 長期服務金",
    ],
    summary:
      "Where an employee who would have been entitled to long service payment dies, the payment is payable to the employee's personal representative.",
  },
  {
    section: "31V",
    titleEn: "Amount of long service payment",
    titleZh: "長期服務金的款額",
    part: "VB",
    partTitleEn: "Long Service Payments",
    partTitleZh: "長期服務金",
    searchQueries: [
      "section 31V employment ordinance long service calculation",
      "long service payment formula amount cap 57",
      "calculate long service payment years wages",
      "長期服務金計算 款額 僱傭條例 第31V條",
    ],
    summary:
      "Sets out the formula for calculating long service payment, similar to severance payment: 2/3 of last month's wages × years of service.",
  },

  // Part VIA — Sickness Allowance
  {
    section: "33",
    titleEn: "Sickness allowance",
    titleZh: "疾病津貼",
    part: "VIA",
    partTitleEn: "Sickness Allowance",
    partTitleZh: "疾病津貼",
    searchQueries: [
      "section 33 employment ordinance sickness allowance",
      "paid sick leave medical certificate cap 57",
      "sickness allowance four fifths daily wages",
      "疾病津貼 病假 醫生紙 僱傭條例 第33條",
      "employee sick leave entitlement Hong Kong",
    ],
    summary:
      "An employee on a continuous contract who has accumulated sufficient paid sickness days is entitled to sickness allowance at 4/5 of daily wages, subject to a medical certificate.",
  },

  // Part VIII — Maternity Protection
  {
    section: "12",
    titleEn: "Maternity leave",
    titleZh: "產假",
    part: "VIII",
    partTitleEn: "Maternity Protection",
    partTitleZh: "生育保障",
    searchQueries: [
      "section 12 employment ordinance maternity leave",
      "maternity leave fourteen weeks pregnant employee",
      "pregnant employee entitled maternity leave cap 57",
      "產假 懷孕僱員 僱傭條例 第12條",
      "maternity leave entitlement Hong Kong",
    ],
    summary:
      "A pregnant employee employed under a continuous contract is entitled to 14 weeks' maternity leave.",
  },
  {
    section: "15",
    titleEn: "Prohibition against termination of employment",
    titleZh: "對終止僱傭的禁止",
    part: "VIII",
    partTitleEn: "Maternity Protection",
    partTitleZh: "生育保障",
    searchQueries: [
      "section 15 employment ordinance dismissal pregnant",
      "unlawful dismissal pregnant employee cap 57",
      "employer dismiss pregnant worker protection",
      "懷孕解僱 不合法 僱傭條例 第15條",
      "pregnancy dismissal protection Hong Kong",
    ],
    summary:
      "An employer must not dismiss a pregnant employee who has served a notice of pregnancy, except for cause unrelated to the pregnancy.",
  },

  // Part VIIA — Holidays with Pay
  {
    section: "39",
    titleEn: "Grant of holidays",
    titleZh: "假日的給予",
    part: "VIIA",
    partTitleEn: "Holidays with Pay",
    partTitleZh: "有薪假日",
    searchQueries: [
      "section 39 employment ordinance statutory holiday",
      "statutory holiday paid public holiday cap 57",
      "employer fail grant statutory holiday offence",
      "法定假日 有薪假日 僱傭條例 第39條",
      "public holiday entitlement employee Hong Kong",
    ],
    summary:
      "An employee is entitled to statutory holidays. If employed under a continuous contract, these are paid holidays.",
  },

  // Part VIIAA — Annual Leave
  {
    section: "41AA",
    titleEn: "Annual leave",
    titleZh: "年假",
    part: "VIIAA",
    partTitleEn: "Annual Leave",
    partTitleZh: "年假",
    searchQueries: [
      "section 41AA employment ordinance annual leave",
      "annual leave entitlement seven fourteen days",
      "paid annual leave continuous contract cap 57",
      "年假 有薪年假 僱傭條例 第41AA條",
      "annual leave calculation employment Hong Kong",
    ],
    summary:
      "An employee employed under a continuous contract for 12 months is entitled to paid annual leave, starting at 7 days and increasing to a maximum of 14 days.",
  },

  // Part VIB — Employment Protection
  {
    section: "32K",
    titleEn:
      "Reasons for the dismissal or the variation of the terms of the contract of employment",
    titleZh: "解僱或更改僱傭合約條款的理由",
    part: "VIB",
    partTitleEn: "Employment Protection",
    partTitleZh: "僱傭保障",
    searchQueries: [
      "section 32K employment ordinance unreasonable dismissal",
      "unreasonable dismissal employment protection cap 57",
      "employee claim unfair dismissal valid reason",
      "不合理解僱 僱傭保障 僱傭條例 第32K條",
      "wrongful dismissal compensation Hong Kong",
    ],
    summary:
      "An employee employed under a continuous contract for 24 months or more who is dismissed other than for a valid reason may claim unreasonable dismissal.",
  },
  {
    section: "32N",
    titleEn: "Order for reinstatement and re-engagement",
    titleZh: "復職及再次聘用的命令",
    part: "VIB",
    partTitleEn: "Employment Protection",
    partTitleZh: "僱傭保障",
    searchQueries: [
      "section 32N employment ordinance reinstatement re-engagement",
      "order reinstatement re-engagement employment protection cap 57",
      "labour tribunal reinstatement order employee",
      "僱傭條例 第32N條 復職 再次聘用",
    ],
    summary:
      "The Labour Tribunal may order reinstatement or re-engagement of an employee who has been unreasonably dismissed, subject to the consent of both parties.",
  },

  // Part XII — Offences and Penalties
  {
    section: "63",
    titleEn: "Offences and penalty",
    titleZh: "罪行及罰則",
    part: "XII",
    partTitleEn: "Offences and Penalties",
    partTitleZh: "罪行及罰則",
    searchQueries: [
      "section 63 employment ordinance wilfully fail pay wages",
      "criminal offence employer not paying wages",
      "prosecution employer unpaid wages seven days",
      "故意不支付工資 罪行 僱傭條例 第63條",
      "employer convicted failing pay wages Hong Kong",
    ],
    summary:
      "An employer who wilfully and without reasonable excuse fails to pay wages within 7 days of their becoming due commits a criminal offence, punishable by a fine and imprisonment.",
  },
  {
    section: "70",
    titleEn: "Contracting out",
    titleZh: "訂立本條例不適用的合約條款",
    part: "XII",
    partTitleEn: "Offences and Penalties",
    partTitleZh: "罪行及罰則",
    searchQueries: [
      "section 70 employment ordinance contracting out void",
      "contract term void reduce extinguish employee right",
      "employer cannot contract out employment ordinance",
      "僱傭條例 第70條 訂約不受管限 無效",
    ],
    summary:
      "Any term of a contract of employment which purports to extinguish or reduce any right, benefit or protection conferred upon the employee by this Ordinance shall be void.",
  },

  // Part XII — Miscellaneous
  {
    section: "72B",
    titleEn:
      "Employment not to be terminated, etc. by reason of fact that employee gave evidence, etc.",
    titleZh:
      "不得以僱員曾在根據本條例進行的法律程序中作供等理由而終止僱用及其他情況",
    part: "XII",
    partTitleEn: "Miscellaneous",
    partTitleZh: "雜項",
    searchQueries: [
      "section 72B employment ordinance employee gave evidence",
      "dismiss employee giving evidence labour tribunal",
      "retaliation dismissal employee testimony cap 57",
      "僱傭條例 第72B條 僱員作證 終止僱傭",
      "employer terminate employee whistleblower labour department",
    ],
    summary:
      "Prohibits an employer from terminating an employee's employment by reason of the employee having given evidence or information in proceedings under the Ordinance. A contravention triggers Part VIA remedies (reinstatement, re-engagement, or compensation) and may constitute a criminal offence.",
  },
];

// Group sections by Part for display
export function getSectionsByPart(): Map<string, SectionDefinition[]> {
  const groups = new Map<string, SectionDefinition[]>();
  for (const s of CAP57_SECTIONS) {
    const key = `Part ${s.part}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return groups;
}
