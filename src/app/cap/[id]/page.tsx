import { notFound } from "next/navigation";
import OrdinancePageClient from "./OrdinancePageClient";
import ordinancesConfig from "@/data/ordinances-config.json";
import { readFileSync } from "fs";
import { join } from "path";

export async function generateStaticParams() {
  // Generate static pages for all ordinances
  return ordinancesConfig.ordinances.map((ord) => ({
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
