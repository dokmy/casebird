const { GoogleAdsApi } = require("google-ads-api");
require("dotenv").config({ path: ".env.local" });

// Initialize Google Ads client
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_ACCOUNT_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

// Hong Kong Ordinances to research
const ORDINANCES = [
  {
    name: "Companies Ordinance",
    cap: "32",
    seeds: ["companies ordinance", "cap 32", "公司條例", "香港公司條例", "公司法"],
  },
  {
    name: "Employment Ordinance",
    cap: "57",
    seeds: ["employment ordinance", "cap 57", "僱傭條例", "勞工法", "僱傭法"],
  },
  {
    name: "Inland Revenue Ordinance",
    cap: "112",
    seeds: ["inland revenue ordinance", "cap 112", "稅務條例", "香港稅務", "稅例"],
  },
  {
    name: "Land Registration Ordinance",
    cap: "128",
    seeds: ["land registration", "cap 128", "土地註冊條例", "物業註冊"],
  },
  {
    name: "Occupational Safety and Health Ordinance",
    cap: "509",
    seeds: ["occupational safety", "cap 509", "職業安全", "工業安全條例"],
  },
  {
    name: "Personal Data (Privacy) Ordinance",
    cap: "486",
    seeds: ["personal data ordinance", "privacy ordinance", "cap 486", "私隱條例", "個人資料私隱條例"],
  },
  {
    name: "Securities and Futures Ordinance",
    cap: "571",
    seeds: ["securities and futures", "cap 571", "證券及期貨條例", "證券條例"],
  },
  {
    name: "Employees' Compensation Ordinance",
    cap: "282",
    seeds: ["employees compensation", "cap 282", "僱員補償條例", "工傷補償"],
  },
  {
    name: "Matrimonial Causes Ordinance",
    cap: "179",
    seeds: ["matrimonial causes", "divorce", "cap 179", "婚姻訴訟條例", "離婚條例"],
  },
  {
    name: "Landlord and Tenant Ordinance",
    cap: "7",
    seeds: ["landlord tenant", "cap 7", "業主與租客條例", "租務條例"],
  },
  {
    name: "Immigration Ordinance",
    cap: "115",
    seeds: ["immigration ordinance", "cap 115", "入境條例", "香港入境"],
  },
  {
    name: "Bankruptcy Ordinance",
    cap: "6",
    seeds: ["bankruptcy ordinance", "cap 6", "破產條例", "破產法"],
  },
  {
    name: "Copyright Ordinance",
    cap: "528",
    seeds: ["copyright ordinance", "cap 528", "版權條例", "香港版權"],
  },
  {
    name: "Trade Marks Ordinance",
    cap: "559",
    seeds: ["trade marks", "trademark", "cap 559", "商標條例"],
  },
  {
    name: "Theft Ordinance",
    cap: "210",
    seeds: ["theft ordinance", "cap 210", "盜竊罪條例", "盜竊"],
  },
  {
    name: "Building Management Ordinance",
    cap: "344",
    seeds: ["building management", "cap 344", "建築物管理條例", "大廈管理"],
  },
  {
    name: "Sale of Goods Ordinance",
    cap: "26",
    seeds: ["sale of goods", "cap 26", "貨品售賣條例"],
  },
  {
    name: "Electronic Transactions Ordinance",
    cap: "553",
    seeds: ["electronic transactions", "cap 553", "電子交易條例"],
  },
  // Criminal Law Ordinances
  {
    name: "Dangerous Drugs Ordinance",
    cap: "134",
    seeds: ["dangerous drugs ordinance", "cap 134", "危險藥物條例", "trafficking in dangerous drugs ordinance", "possession dangerous drugs cap 134", "dangerous drugs ordinance section", "ddor"],
  },
  {
    name: "Crimes Ordinance",
    cap: "200",
    seeds: ["crimes ordinance", "cap 200", "刑事罪行條例", "crimes ordinance section", "indecent assault ordinance", "robbery cap 200", "assault occasioning actual bodily harm"],
  },
  {
    name: "Criminal Procedure Ordinance",
    cap: "221",
    seeds: ["criminal procedure ordinance", "cap 221", "刑事訴訟程序條例", "bail hong kong", "criminal procedure", "committal proceedings", "criminal procedure section"],
  },
  {
    name: "Organized and Serious Crimes Ordinance",
    cap: "455",
    seeds: ["osco", "cap 455", "有組織及嚴重罪行條例", "organized serious crimes ordinance", "money laundering ordinance", "dealing with proceeds of crime", "osco section"],
  },
  {
    name: "Prevention of Bribery Ordinance",
    cap: "201",
    seeds: ["prevention of bribery ordinance", "cap 201", "防止賄賂條例", "bribery ordinance", "acceptance of advantage", "prevention of bribery section", "pobo"],
  },
  {
    name: "Road Traffic Ordinance",
    cap: "374",
    seeds: ["road traffic ordinance", "cap 374", "道路交通條例", "dangerous driving ordinance", "causing death by dangerous driving cap 374", "dangerous driving causing grievous bodily harm", "road traffic ordinance section"],
  },
  // Additional PI Ordinance
  {
    name: "Fatal Accidents Ordinance",
    cap: "22",
    seeds: ["fatal accidents", "death claims", "dependency claims", "cap 22", "致命意外條例", "死亡索償"],
  },
];

async function researchKeywords(seedKeywords, minVolume = 50) {
  try {
    const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: process.env.GOOGLE_ADS_ACCOUNT_ID,
      language: "languageConstants/1000", // English
      geo_target_constants: ["geoTargetConstants/2344"], // Hong Kong
      keyword_seed: { keywords: seedKeywords },
      keyword_plan_network: "GOOGLE_SEARCH",
      include_adult_keywords: false,
    });

    const results = response
      .map((idea) => ({
        keyword: idea.text,
        volume: idea.keyword_idea_metrics?.avg_monthly_searches || 0,
        competition: idea.keyword_idea_metrics?.competition || "UNKNOWN",
        competitionIndex: idea.keyword_idea_metrics?.competition_index || 0,
        cpcLow:
          idea.keyword_idea_metrics?.low_top_of_page_bid_micros
            ? (idea.keyword_idea_metrics.low_top_of_page_bid_micros / 1000000).toFixed(2)
            : "0.00",
        cpcHigh:
          idea.keyword_idea_metrics?.high_top_of_page_bid_micros
            ? (idea.keyword_idea_metrics.high_top_of_page_bid_micros / 1000000).toFixed(2)
            : "0.00",
      }))
      .filter((k) => k.volume >= minVolume)
      .sort((a, b) => b.volume - a.volume);

    return results;
  } catch (error) {
    console.error(`Error researching keywords:`, error.message);
    return [];
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("HONG KONG ORDINANCES KEYWORD RESEARCH");
  console.log("Target Market: Hong Kong | Min Volume: 50 searches/month");
  console.log("=".repeat(80));
  console.log("");

  const allResults = [];
  const allKeywords = []; // Store all individual keywords

  for (const ord of ORDINANCES) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`📋 ${ord.name} (Cap ${ord.cap})`);
    console.log(`${"─".repeat(80)}`);

    const keywords = await researchKeywords(ord.seeds);

    if (keywords.length === 0) {
      console.log("  ⚠️  No keyword data found");
    } else {
      // Show top 10 keywords
      const top10 = keywords.slice(0, 10);

      console.log(`\n  Found ${keywords.length} keywords | Showing top ${Math.min(10, keywords.length)}:\n`);

      for (const kw of top10) {
        const volumeStr = String(kw.volume).padStart(6);
        const cpcRange = `HK$${kw.cpcLow}-${kw.cpcHigh}`.padEnd(18);
        const comp = kw.competition.padEnd(8);
        console.log(`  ${volumeStr}/mo | ${cpcRange} | ${comp} | ${kw.keyword}`);
      }

      // Calculate totals
      const totalVolume = keywords.reduce((sum, k) => sum + k.volume, 0);
      const avgCpcLow = (keywords.reduce((sum, k) => sum + parseFloat(k.cpcLow), 0) / keywords.length).toFixed(2);
      const avgCpcHigh = (keywords.reduce((sum, k) => sum + parseFloat(k.cpcHigh), 0) / keywords.length).toFixed(2);

      console.log(`\n  📊 Summary: ${keywords.length} keywords | ${totalVolume.toLocaleString()} total monthly searches`);
      console.log(`  💰 Avg CPC: HK$${avgCpcLow}-${avgCpcHigh}`);

      // Store ALL keywords with ordinance info
      keywords.forEach(kw => {
        allKeywords.push({
          ...kw,
          ordinanceName: ord.name,
          ordinanceCap: ord.cap,
        });
      });

      // Store for final summary
      allResults.push({
        ordinance: `${ord.name} (Cap ${ord.cap})`,
        keywordCount: keywords.length,
        totalVolume,
        avgCpcLow: parseFloat(avgCpcLow),
        avgCpcHigh: parseFloat(avgCpcHigh),
        topKeyword: keywords[0],
      });
    }

    // Delay between requests to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log("\n\n");
  console.log("=".repeat(80));
  console.log("SUMMARY — TOP OPPORTUNITIES BY SEARCH VOLUME");
  console.log("=".repeat(80));
  console.log("");

  // Sort by total volume
  allResults.sort((a, b) => b.totalVolume - a.totalVolume);

  allResults.forEach((result, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${result.ordinance}`);
    console.log(`    ${result.totalVolume.toLocaleString()} searches/mo across ${result.keywordCount} keywords`);
    console.log(`    Top keyword: "${result.topKeyword.keyword}" (${result.topKeyword.volume}/mo)`);
    console.log(`    Avg CPC: HK$${result.avgCpcLow.toFixed(2)}-${result.avgCpcHigh.toFixed(2)}`);
    console.log("");
  });

  // Overall totals
  const grandTotal = allResults.reduce((sum, r) => sum + r.totalVolume, 0);
  const totalKeywords = allResults.reduce((sum, r) => sum + r.keywordCount, 0);
  console.log("=".repeat(80));
  console.log(`🎯 TOTAL: ${totalKeywords} keywords | ${grandTotal.toLocaleString()} monthly searches`);
  console.log("=".repeat(80));

  // Save all individual keywords to JSON
  const fs = require('fs');
  const path = require('path');

  const outputData = {
    generatedAt: new Date().toISOString(),
    totalKeywords: allKeywords.length,
    keywords: allKeywords.sort((a, b) => b.volume - a.volume), // Sort by volume desc
  };

  const outputPath = path.join(__dirname, '../src/data/all-ordinance-keywords.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n✅ Saved ${allKeywords.length} keywords to ${outputPath}`);
}

main().catch(console.error);
