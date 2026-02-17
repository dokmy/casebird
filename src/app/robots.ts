import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cap/", "/privacy", "/terms"],
        disallow: ["/api/", "/admin/", "/settings/", "/auth/"],
      },
    ],
    sitemap: "https://casebird.ai/sitemap.xml",
  };
}
