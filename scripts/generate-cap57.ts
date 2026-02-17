/**
 * Offline generation script for Cap 57 annotated case law.
 *
 * Searches Pinecone for cases citing each section of the Employment Ordinance,
 * then uses Gemini to generate brief annotations explaining how each case
 * interprets the section.
 *
 * Usage: npx tsx scripts/generate-cap57.ts
 * Requires: .env.local with PINECONE_API_KEY, PINECONE_INDEX_HOST, VOYAGE_API_KEY, GEMINI_API_KEY
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Load env vars from .env.local manually (avoid dotenv dependency)
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  if (!process.env[key]) process.env[key] = value;
}

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const PINECONE_HOST = process.env.PINECONE_INDEX_HOST!;
const PINECONE_KEY = process.env.PINECONE_API_KEY!;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;

// --- Types ---

interface PineconeMatch {
  id: string;
  score: number;
  metadata: {
    text: string;
    neutral_citation: string;
    court_code: string;
    language: string;
    year: number;
    judgment_date: string;
    chunk_index: number;
    paragraph_start: number;
    paragraph_end: number;
    char_count: number;
    is_truncated: boolean;
  };
}

interface CaseAnnotation {
  citation: string;
  court: string;
  year: number;
  language: string;
  score: number;
  relevantText: string; // The chunk text that mentions the section
  annotation: string; // Gemini-generated summary
  url: string;
}

interface SectionAnnotation {
  section: string;
  titleEn: string;
  titleZh: string;
  cases: CaseAnnotation[];
}

// --- Search functions (mirrors src/lib/) ---

async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOYAGE_KEY}`,
    },
    body: JSON.stringify({
      model: "voyage-3-lite",
      input: [query],
      input_type: "query",
    }),
  });
  if (!response.ok) throw new Error(`Voyage error: ${await response.text()}`);
  const result = await response.json();
  return result.data[0].embedding;
}

function generateSparseVector(text: string) {
  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }
  const indices: number[] = [];
  const values: number[] = [];
  for (const [term, freq] of termFreq) {
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      hash = ((hash << 5) - hash + term.charCodeAt(i)) | 0;
    }
    indices.push(Math.abs(hash) % 2147483647);
    values.push(Math.log(1 + freq));
  }
  return { indices, values };
}

async function searchPinecone(
  query: string,
  topK: number = 20
): Promise<PineconeMatch[]> {
  const denseVector = await getQueryEmbedding(query);
  const sparseVector = generateSparseVector(query);
  const hasSparse = sparseVector.indices.length > 0;

  const response = await fetch(`${PINECONE_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: denseVector,
      ...(hasSparse ? { sparseVector } : {}),
      topK,
      includeMetadata: true,
    }),
  });

  if (!response.ok) throw new Error(`Pinecone error: ${await response.text()}`);
  const result = await response.json();
  return result.matches || [];
}

function getCaseUrl(citation: string, language: string = "EN"): string {
  const lang = language.toUpperCase() === "TC" ? "tc" : "en";
  const match = citation
    .trim()
    .match(/\[(\d{4})\]\s*(\w+)\s+(?:No\.\s*)?(\d+)/i);
  if (!match) return "";
  const [, year, court, number] = match;
  return `https://www.hklii.hk/${lang}/cases/${court.toLowerCase()}/${year}/${number}`;
}

// --- Gemini annotation ---

async function generateAnnotation(
  sectionNum: string,
  sectionTitle: string,
  citation: string,
  chunkText: string
): Promise<string> {
  const prompt = `You are a Hong Kong legal research assistant. Given a chunk of text from a court judgment, write a 2-3 sentence annotation explaining how this case interprets or applies Section ${sectionNum} (${sectionTitle}) of the Employment Ordinance (Cap. 57).

Focus on: what legal principle the court established or applied, and the outcome relevant to this section. Be concise and factual. Do not speculate beyond what the text shows. If the text doesn't clearly discuss Section ${sectionNum}, say "This case references the Employment Ordinance but does not directly interpret Section ${sectionNum}."

Case: ${citation}
Text excerpt:
${chunkText.slice(0, 2000)}

Annotation:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) {
    console.error(`Gemini error for ${citation}: ${response.status}`);
    return "Annotation unavailable.";
  }

  const result = await response.json();
  return (
    result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "Annotation unavailable."
  );
}

// --- Main logic ---

async function processSection(section: {
  section: string;
  titleEn: string;
  titleZh: string;
  searchQueries: string[];
}): Promise<SectionAnnotation> {
  console.log(`\n--- Processing s.${section.section}: ${section.titleEn} ---`);

  // Run all search queries and collect matches
  const allMatches: PineconeMatch[] = [];
  for (const query of section.searchQueries) {
    console.log(`  Searching: "${query.slice(0, 60)}..."`);
    try {
      const matches = await searchPinecone(query, 20);
      allMatches.push(...matches);
    } catch (e) {
      console.error(`  Search error: ${e}`);
    }
  }

  // Deduplicate by citation, keeping highest-scoring chunk per case
  const bestByCase = new Map<
    string,
    PineconeMatch & { mentionsSection: boolean }
  >();

  // Build regex to check if text mentions this section
  const sNum = section.section;
  // Match patterns like "section 9", "s. 9", "s 9", "s.9", "第9條"
  const sectionRegex = new RegExp(
    `(?:section\\s+${sNum}(?:\\b|[^0-9])|s\\.?\\s*${sNum}(?:\\b|[^0-9])|第\\s*${sNum}\\s*條)`,
    "i"
  );

  for (const match of allMatches) {
    const citation = match.metadata.neutral_citation;
    const mentionsSection = sectionRegex.test(match.metadata.text);
    const existing = bestByCase.get(citation);

    // Prefer chunks that actually mention the section number
    if (!existing) {
      bestByCase.set(citation, { ...match, mentionsSection });
    } else if (mentionsSection && !existing.mentionsSection) {
      bestByCase.set(citation, { ...match, mentionsSection });
    } else if (
      mentionsSection === existing.mentionsSection &&
      match.score > existing.score
    ) {
      bestByCase.set(citation, { ...match, mentionsSection });
    }
  }

  // Sort: cases that mention the section first, then by score
  const sorted = [...bestByCase.values()].sort((a, b) => {
    if (a.mentionsSection !== b.mentionsSection)
      return a.mentionsSection ? -1 : 1;
    return b.score - a.score;
  });

  // Take top 5 cases
  const topCases = sorted.slice(0, 5);

  console.log(
    `  Found ${bestByCase.size} unique cases, ${sorted.filter((s) => s.mentionsSection).length} mention section ${sNum}`
  );

  // Generate annotations
  const cases: CaseAnnotation[] = [];
  for (const match of topCases) {
    console.log(
      `  Annotating: ${match.metadata.neutral_citation} (score: ${match.score.toFixed(2)}, mentions: ${match.mentionsSection})`
    );

    const annotation = await generateAnnotation(
      section.section,
      section.titleEn,
      match.metadata.neutral_citation,
      match.metadata.text
    );

    // Skip cases that don't actually discuss this section
    if (annotation.includes("does not directly interpret")) {
      console.log(`    Skipped (not relevant)`);
      continue;
    }

    cases.push({
      citation: match.metadata.neutral_citation,
      court: match.metadata.court_code,
      year: match.metadata.year,
      language: match.metadata.language,
      score: Math.round(match.score * 1000) / 1000,
      relevantText: match.metadata.text.slice(0, 500),
      annotation,
      url: getCaseUrl(
        match.metadata.neutral_citation,
        match.metadata.language
      ),
    });

    // Rate limit Gemini
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`  Final: ${cases.length} annotated cases`);

  return {
    section: section.section,
    titleEn: section.titleEn,
    titleZh: section.titleZh,
    cases,
  };
}

async function main() {
  // Dynamically import the section definitions
  const { CAP57_SECTIONS, CAP57_METADATA } = await import(
    "../src/data/cap57-sections"
  );

  console.log(
    `Generating annotations for ${CAP57_SECTIONS.length} sections of Cap 57...`
  );
  console.log(`Pinecone host: ${PINECONE_HOST}`);

  const results: SectionAnnotation[] = [];

  for (const section of CAP57_SECTIONS) {
    const annotation = await processSection(section);
    results.push(annotation);
  }

  // Write output
  const output = {
    metadata: CAP57_METADATA,
    generatedAt: new Date().toISOString(),
    sections: results,
    stats: {
      totalSections: results.length,
      totalCases: results.reduce((sum, s) => sum + s.cases.length, 0),
      sectionsWithCases: results.filter((s) => s.cases.length > 0).length,
    },
  };

  const outputPath = resolve(__dirname, "../src/data/cap57-annotations.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n=== DONE ===`);
  console.log(`Output: ${outputPath}`);
  console.log(`Sections: ${output.stats.totalSections}`);
  console.log(`Total cases: ${output.stats.totalCases}`);
  console.log(
    `Sections with cases: ${output.stats.sectionsWithCases}/${output.stats.totalSections}`
  );
}

main().catch(console.error);
