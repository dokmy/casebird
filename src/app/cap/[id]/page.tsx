import { notFound } from "next/navigation";
import OrdinancePageClient from "./OrdinancePageClient";
import ordinancesConfig from "@/data/ordinances-config.json";
import { readFileSync } from "fs";
import { join } from "path";

export async function generateStaticParams() {
  // Only pre-generate smaller ordinances to avoid Vercel's 19MB limit
  // Ordinances with structure files > 1MB will be generated on-demand
  // Excluded: 6 (1.2M), 112 (16M), 115 (1.7M), 221 (1.4M), 344 (1.8M), 374 (2.7M),
  //           455 (801K), 486 (6.9M), 528 (3.2M), 559 (1.3M), 571 (11M), 7 (1.9M), 32 (3.5M)
  const smallOrdinances = ["26", "57", "128", "179", "201", "210", "282", "509", "553"];

  return ordinancesConfig.ordinances
    .filter((ord) => smallOrdinances.includes(ord.cap))
    .map((ord) => ({
      id: ord.cap,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ordinance = ordinancesConfig.ordinances.find((o) => o.cap === id);

  if (!ordinance) {
    return {
      title: "Ordinance Not Found - Casebird",
    };
  }

  return {
    title: `Cap. ${ordinance.cap} — ${ordinance.title} (${ordinance.titleZh}) - Casebird`,
    description: `Browse and search ${ordinance.title} with AI-powered legal research.`,
  };
}

export default async function OrdinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Load ordinance config
  const ordinance = ordinancesConfig.ordinances.find((o) => o.cap === id);

  if (!ordinance) {
    notFound();
  }

  // Load structure data
  let ordinanceData;
  try {
    const structurePath = join(process.cwd(), `src/data/cap${id}-structure.json`);
    const structureContent = readFileSync(structurePath, "utf-8");
    ordinanceData = JSON.parse(structureContent);
  } catch (error) {
    notFound();
  }

  return (
    <OrdinancePageClient
      cap={id}
      title={ordinance.title}
      titleZh={ordinance.titleZh}
      exampleQuestions={ordinance.exampleQuestions}
      ordinanceData={ordinanceData}
    />
  );
}
