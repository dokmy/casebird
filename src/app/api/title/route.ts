import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = (await request.json()) as { message: string };

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a very short title (max 6 words) for a legal research chat that starts with this query. Return ONLY the title, no quotes, no punctuation at the end.\n\nQuery: ${message}`,
            },
          ],
        },
      ],
    });

    const title = response.text?.trim() || message.substring(0, 50);

    return Response.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return Response.json(
      { title: null, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
