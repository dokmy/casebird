const fs = require('fs');
const path = require('path');

// Read the keyword data
const inputPath = path.join(__dirname, '../src/data/all-ordinance-keywords.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Legal acronyms that lawyers use
const LEGAL_ACRONYMS = [
  'osco', 'pobo', 'ddor', 'pdpo', 'sfo', 'ero', 'iro',
  'cisg', 'osho', 'oshc', 'sfc'
];

// Legal terminology that indicates lawyer searches
const LEGAL_TERMS = [
  'compensation', 'liability', 'damages', 'breach', 'quantum',
  'negligence', 'duty', 'vicarious', 'tortious', 'statutory',
  'indemnity', 'derivative', 'fiduciary', 'winding up',
  'liquidation', 'insolvency', 'bankruptcy', 'judicial review',
  'mandamus', 'certiorari', 'injunction', 'specific performance',
  'estoppel', 'misrepresentation', 'rescission', 'restitution',
  'unjust enrichment', 'passing off', 'infringement',
  'conspiracy', 'defamation', 'libel', 'slander',
  'trespass', 'conversion', 'detinue', 'nuisance',
  'easement', 'covenant', 'estoppel', 'adverse possession',
  '補償', '賠償', '責任', '索償', '疏忽', '違約', '侵權'
];

function isLawyerKeyword(keyword) {
  const lower = keyword.toLowerCase();

  // Exclude patterns that aren't lawyer searches
  const exclusions = [
    /\bwww\b/i,           // URL searches
    /\bhttp/i,            // URL searches
    /\.com\b/i,           // URL searches
    /\s+bc$/i,            // "British Columbia" at end (wrong jurisdiction)
    /\bjewel\b/i,         // Jewelry stores (noise from OSCO search)
    /\bstore\b/i,         // Generic store searches
  ];

  // Exclude if matches any exclusion pattern
  if (exclusions.some(pattern => pattern.test(keyword))) {
    return false;
  }

  // Must contain one of these lawyer indicators
  const indicators = [
    /\bordinance\b/i,
    /條例/, // Chinese "ordinance" - no word boundary needed, can have spaces
    /\bcap\s*\d+/i,
    /\bsection\s*\d+/i,
    /\bs\.\s*\d+/i,
    /第\s*\d+\s*條/,
  ];

  // Check if keyword contains any ordinance/cap/section reference
  if (indicators.some(pattern => pattern.test(keyword))) {
    return true;
  }

  // Check if it's a legal acronym
  if (LEGAL_ACRONYMS.some(acronym => lower === acronym || lower.includes(acronym + ' '))) {
    return true;
  }

  // Check if it contains legal terminology
  if (LEGAL_TERMS.some(term => lower.includes(term))) {
    return true;
  }

  return false;
}

// Filter keywords
const filteredKeywords = data.keywords.filter(kw => isLawyerKeyword(kw.keyword));

console.log(`Original keywords: ${data.keywords.length}`);
console.log(`Filtered keywords: ${filteredKeywords.length}`);
console.log(`Removed: ${data.keywords.length - filteredKeywords.length}`);

// Show examples of removed keywords (first 20)
const removed = data.keywords.filter(kw => !isLawyerKeyword(kw.keyword)).slice(0, 20);
console.log('\nExamples of removed keywords:');
removed.forEach(kw => {
  console.log(`  ❌ "${kw.keyword}" (${kw.volume}/mo) - ${kw.ordinanceName}`);
});

// Save filtered data
const outputData = {
  generatedAt: new Date().toISOString(),
  totalKeywords: filteredKeywords.length,
  keywords: filteredKeywords,
};

const outputPath = path.join(__dirname, '../src/data/all-ordinance-keywords.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log(`\n✅ Saved ${filteredKeywords.length} lawyer-focused keywords to ${outputPath}`);

// Summary by ordinance
const byOrdinance = {};
filteredKeywords.forEach(kw => {
  if (!byOrdinance[kw.ordinanceName]) {
    byOrdinance[kw.ordinanceName] = { count: 0, volume: 0 };
  }
  byOrdinance[kw.ordinanceName].count++;
  byOrdinance[kw.ordinanceName].volume += kw.volume;
});

console.log('\nKeywords by Ordinance (after filtering):');
Object.entries(byOrdinance)
  .sort((a, b) => b[1].volume - a[1].volume)
  .forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.count} keywords, ${stats.volume.toLocaleString()} searches/mo`);
  });
