import { MetadataRoute } from "next";
import annotationsData from "@/data/cap57-annotations.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://casebird.ai";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Cap 57 overview page
  const cap57Pages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/cap/57`,
      lastModified: new Date(annotationsData.generatedAt),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // Cap 57 section pages
  const sectionPages: MetadataRoute.Sitemap = annotationsData.sections.map(
    (section) => ({
      url: `${baseUrl}/cap/57/s/${section.section}`,
      lastModified: new Date(annotationsData.generatedAt),
      changeFrequency: "monthly" as const,
      priority: section.cases.length > 0 ? 0.8 : 0.5,
    })
  );

  return [...staticPages, ...cap57Pages, ...sectionPages];
}
