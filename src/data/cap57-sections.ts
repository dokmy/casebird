// Cap 57 — Employment Ordinance (僱傭條例)
// Section definitions with search keywords for Pinecone annotation generation

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
  hkliiUrl: "https://www.hklii.hk/eng/hk/legis/ord/57/",
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
      "section 2 employment ordinance interpretation definition employee employer cap 57",
      "僱傭條例 第2條 僱員 僱主 定義 釋義",
    ],
    summary:
      "Defines key terms including 'employee', 'employer', 'wages', and 'contract of employment'. Central to disputes about whether a person is an employee or independent contractor.",
  },
  {
    section: "4",
    titleEn: "Application",
    titleZh: "適用範圍",
    part: "I",
    partTitleEn: "Preliminary",
    partTitleZh: "導言",
    searchQueries: [
      "section 4 employment ordinance application scope exclusion cap 57",
      "僱傭條例 第4條 適用範圍",
    ],
    summary:
      "Specifies who the Ordinance applies to and any exclusions. Domestic helpers, seamen, and family members of the employer are covered with some modifications.",
  },

  // Part II — Contracts of Employment
  {
    section: "6",
    titleEn: "Contracts of employment",
    titleZh: "僱傭合約",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 6 employment ordinance contract employment terms conditions cap 57",
      "僱傭條例 第6條 僱傭合約 條款",
    ],
    summary:
      "Sets out requirements for contracts of employment, including that certain terms must not be less favourable than the Ordinance provides.",
  },
  {
    section: "6A",
    titleEn: "Continuous contract",
    titleZh: "連續性合約",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 6A employment ordinance continuous contract 418 rule four weeks eighteen hours cap 57",
      "僱傭條例 第6A條 連續性合約 418 四星期十八小時",
    ],
    summary:
      "The '418 rule': an employee is regarded as employed under a continuous contract if they work for the same employer for 4 weeks or more, with at least 18 hours per week.",
  },
  {
    section: "7",
    titleEn: "Termination of contract of employment",
    titleZh: "終止僱傭合約",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 7 employment ordinance termination contract notice period cap 57",
      "僱傭條例 第7條 終止僱傭合約 通知期",
    ],
    summary:
      "Governs how employment contracts may be terminated, including the required notice period or payment in lieu of notice.",
  },
  {
    section: "8",
    titleEn: "Summary dismissal",
    titleZh: "即時解僱",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 8 employment ordinance summary dismissal employer wilful disobedience misconduct fraud cap 57",
      "僱傭條例 第8條 即時解僱 嚴重過失",
    ],
    summary:
      "Allows an employer to summarily dismiss an employee without notice for wilful disobedience, misconduct, fraud, dishonesty, or habitual neglect of duty.",
  },
  {
    section: "9",
    titleEn: "Termination of contract by employee",
    titleZh: "僱員終止合約",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 9 employment ordinance unreasonable dismissal constructive dismissal employee terminate cap 57",
      "僱傭條例 第9條 不合理解僱 推定解僱 僱員終止合約",
    ],
    summary:
      "Allows an employee to terminate the contract without notice if the employer fails to pay wages, the employee is in fear of violence or disease, or is subjected to ill-treatment.",
  },
  {
    section: "10",
    titleEn: "Notice of termination required",
    titleZh: "所需的終止僱傭合約通知",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 10 employment ordinance notice termination period one month seven days cap 57",
      "僱傭條例 第10條 通知期 終止僱傭 一個月",
    ],
    summary:
      "Requires not less than one month's notice (or as specified in the contract) for termination. During probation, shorter notice may apply.",
  },
  {
    section: "10A",
    titleEn: "Payment in lieu of notice",
    titleZh: "代通知金",
    part: "II",
    partTitleEn: "Contracts of Employment",
    partTitleZh: "僱傭合約",
    searchQueries: [
      "section 10A employment ordinance payment lieu notice wages cap 57",
      "僱傭條例 第10A條 代通知金",
    ],
    summary:
      "Either party may terminate the contract by paying wages in lieu of the notice period instead of serving out the notice.",
  },

  // Part III — Protection of Wages
  {
    section: "21",
    titleEn: "When wages become due",
    titleZh: "工資到期支付的時間",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 21 employment ordinance wages due payment time cap 57",
      "僱傭條例 第21條 工資 到期 支付",
    ],
    summary:
      "Wages become due on expiry of the last day of the wage period, and must be paid as soon as practicable but no later than 7 days after.",
  },
  {
    section: "22",
    titleEn: "Deductions from wages",
    titleZh: "扣除工資",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 22 employment ordinance deduction wages unlawful cap 57",
      "僱傭條例 第22條 扣除工資 扣薪",
    ],
    summary:
      "Restricts the types of deductions an employer may make from wages. Only specific deductions (e.g. for absence, damage due to negligence) are permitted.",
  },
  {
    section: "23",
    titleEn: "Restriction on deductions",
    titleZh: "對扣除工資的限制",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 23 employment ordinance restriction deduction half wages cap 57",
      "僱傭條例 第23條 扣除工資 限制",
    ],
    summary:
      "Total deductions in any wage period must not exceed half the wages payable. Certain deductions (e.g. MPF contributions) are not subject to this limit.",
  },
  {
    section: "25",
    titleEn: "Priority of wages on insolvency",
    titleZh: "無力償債時工資的優先權",
    part: "III",
    partTitleEn: "Protection of Wages",
    partTitleZh: "工資的保障",
    searchQueries: [
      "section 25 employment ordinance wages priority insolvency bankruptcy winding up cap 57",
      "僱傭條例 第25條 工資優先權 清盤 破產",
    ],
    summary:
      "Wages owed to employees are given priority over other unsecured debts in the event of the employer's insolvency.",
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
      "section 17 employment ordinance rest day weekly one day cap 57",
      "僱傭條例 第17條 休息日 每星期",
    ],
    summary:
      "An employee employed under a continuous contract is entitled to not less than 1 rest day in every period of 7 days.",
  },

  // Part VA — Severance Payments
  {
    section: "31B",
    titleEn: "Entitlement to severance payment",
    titleZh: "遣散費的權利",
    part: "VA",
    partTitleEn: "Severance Payments",
    partTitleZh: "遣散費",
    searchQueries: [
      "section 31B employment ordinance severance payment entitlement redundancy laid off cap 57",
      "僱傭條例 第31B條 遣散費 裁員",
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
      "section 31G employment ordinance severance payment calculation amount formula cap 57",
      "僱傭條例 第31G條 遣散費 計算 款額",
    ],
    summary:
      "Sets out the formula for calculating severance payment: 2/3 of the last month's wages × years of service (subject to a statutory cap).",
  },
  {
    section: "31I",
    titleEn: "Severance payment to be reduced",
    titleZh: "遣散費的扣減",
    part: "VA",
    partTitleEn: "Severance Payments",
    partTitleZh: "遣散費",
    searchQueries: [
      "section 31I employment ordinance severance payment reduction gratuity retirement benefit MPF cap 57",
      "僱傭條例 第31I條 遣散費 扣減 強積金 退休金",
    ],
    summary:
      "Severance payment may be reduced by gratuities, retirement scheme benefits, or MPF employer contributions already received by the employee.",
  },

  // Part VB — Long Service Payments
  {
    section: "31R",
    titleEn: "Entitlement to long service payment",
    titleZh: "長期服務金的權利",
    part: "VB",
    partTitleEn: "Long Service Payments",
    partTitleZh: "長期服務金",
    searchQueries: [
      "section 31R employment ordinance long service payment entitlement five years cap 57",
      "僱傭條例 第31R條 長期服務金 五年",
    ],
    summary:
      "An employee under a continuous contract for 5 years or more is entitled to long service payment upon dismissal (other than for cause), death, or retirement.",
  },
  {
    section: "31RA",
    titleEn: "Amount of long service payment",
    titleZh: "長期服務金的款額",
    part: "VB",
    partTitleEn: "Long Service Payments",
    partTitleZh: "長期服務金",
    searchQueries: [
      "section 31RA employment ordinance long service payment calculation amount cap 57",
      "僱傭條例 第31RA條 長期服務金 計算",
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
      "section 33 employment ordinance sickness allowance paid sick leave medical certificate cap 57",
      "僱傭條例 第33條 疾病津貼 病假 醫生紙",
    ],
    summary:
      "An employee on a continuous contract who has accumulated sufficient paid sickness days is entitled to sickness allowance at 4/5 of daily wages, subject to a medical certificate.",
  },

  // Part VIII — Maternity Protection
  {
    section: "12",
    titleEn: "Right to maternity leave",
    titleZh: "產假的權利",
    part: "VIII",
    partTitleEn: "Maternity Protection",
    partTitleZh: "生育保障",
    searchQueries: [
      "section 12 employment ordinance maternity leave pregnant employee cap 57",
      "僱傭條例 第12條 產假 懷孕僱員",
    ],
    summary:
      "A pregnant employee employed under a continuous contract is entitled to 14 weeks' maternity leave.",
  },
  {
    section: "15",
    titleEn: "Dismissal during pregnancy",
    titleZh: "懷孕期間被解僱",
    part: "VIII",
    partTitleEn: "Maternity Protection",
    partTitleZh: "生育保障",
    searchQueries: [
      "section 15 employment ordinance dismissal pregnant employee unlawful cap 57",
      "僱傭條例 第15條 懷孕 解僱 不合法",
    ],
    summary:
      "An employer must not dismiss a pregnant employee who has served a notice of pregnancy, except for cause unrelated to the pregnancy.",
  },

  // Part VIIA — Holidays with Pay
  {
    section: "39",
    titleEn: "Right to statutory holidays",
    titleZh: "法定假日的權利",
    part: "VIIA",
    partTitleEn: "Holidays with Pay",
    partTitleZh: "有薪假日",
    searchQueries: [
      "section 39 employment ordinance statutory holiday paid public holiday cap 57",
      "僱傭條例 第39條 法定假日 有薪假日",
    ],
    summary:
      "An employee is entitled to statutory holidays. If employed under a continuous contract, these are paid holidays.",
  },

  // Part VIIAA — Annual Leave
  {
    section: "41AA",
    titleEn: "Entitlement to annual leave",
    titleZh: "年假的權利",
    part: "VIIAA",
    partTitleEn: "Annual Leave",
    partTitleZh: "年假",
    searchQueries: [
      "section 41AA employment ordinance annual leave entitlement days cap 57",
      "僱傭條例 第41AA條 年假 有薪年假",
    ],
    summary:
      "An employee employed under a continuous contract for 12 months is entitled to paid annual leave, starting at 7 days and increasing to a maximum of 14 days.",
  },

  // Part VIB — Employment Protection
  {
    section: "32K",
    titleEn: "Unreasonable dismissal",
    titleZh: "不合理解僱",
    part: "VIB",
    partTitleEn: "Employment Protection",
    partTitleZh: "僱傭保障",
    searchQueries: [
      "section 32K employment ordinance unreasonable dismissal employment protection cap 57",
      "僱傭條例 第32K條 不合理解僱 僱傭保障",
    ],
    summary:
      "An employee employed under a continuous contract for 24 months or more who is dismissed other than for a valid reason may claim unreasonable dismissal.",
  },
  {
    section: "32N",
    titleEn: "Unreasonable variation of terms",
    titleZh: "不合理更改僱傭條款",
    part: "VIB",
    partTitleEn: "Employment Protection",
    partTitleZh: "僱傭保障",
    searchQueries: [
      "section 32N employment ordinance unreasonable variation terms conditions unilateral change cap 57",
      "僱傭條例 第32N條 不合理更改 僱傭條款",
    ],
    summary:
      "An employer must not unreasonably vary the terms of employment to the detriment of an employee who has been employed continuously for 24 months or more.",
  },

  // Part XII — Offences and Penalties
  {
    section: "63",
    titleEn: "Offence of wilfully and without reasonable excuse failing to pay wages",
    titleZh: "故意及無合理辯解而不支付工資的罪行",
    part: "XII",
    partTitleEn: "Offences and Penalties",
    partTitleZh: "罪行及罰則",
    searchQueries: [
      "section 63 employment ordinance offence wilfully failing pay wages criminal cap 57",
      "僱傭條例 第63條 故意不支付工資 罪行",
    ],
    summary:
      "An employer who wilfully and without reasonable excuse fails to pay wages within 7 days of their becoming due commits a criminal offence, punishable by a fine and imprisonment.",
  },
  {
    section: "70",
    titleEn: "General penalties",
    titleZh: "一般罰則",
    part: "XII",
    partTitleEn: "Offences and Penalties",
    partTitleZh: "罪行及罰則",
    searchQueries: [
      "section 70 employment ordinance offence penalty fine imprisonment cap 57",
      "僱傭條例 第70條 罪行 罰則 罰款",
    ],
    summary:
      "Sets out the general penalties for offences under the Ordinance, including maximum fines and imprisonment terms.",
  },

  // Part XII — Remedies
  {
    section: "72B",
    titleEn: "Order for reinstatement or re-engagement",
    titleZh: "復職或重新聘用命令",
    part: "XII",
    partTitleEn: "Remedies",
    partTitleZh: "補救",
    searchQueries: [
      "section 72B employment ordinance reinstatement re-engagement unreasonable dismissal remedy compensation cap 57",
      "僱傭條例 第72B條 復職 重新聘用 不合理解僱 補償",
    ],
    summary:
      "Where the Labour Tribunal or court finds an employee was unreasonably dismissed, it may order reinstatement, re-engagement, or award terminal payments and compensation.",
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
