import { notFound } from "next/navigation";
import OrdinancePageClient from "./OrdinancePageClient";
import ordinancesConfig from "@/data/ordinances-config.json";
import { getOrdinanceStructure } from "@/lib/supabase/ordinances";

export async function generateStaticParams() {
  // Now we can pre-generate ALL ordinances (no 19MB limit with database!)
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

  // Load structure data from database
  const ordinanceData = await getOrdinanceStructure(id);

  if (!ordinanceData) {
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
