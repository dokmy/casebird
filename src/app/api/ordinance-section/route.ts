import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET(request: NextRequest) {
  const cap = request.nextUrl.searchParams.get("cap");
  const section = request.nextUrl.searchParams.get("section");

  if (!cap || !section) {
    return NextResponse.json({ error: "Missing cap or section" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_ordinance_section_text", {
    p_cap_number: cap,
    p_section_number: section,
  });

  if (error || !data?.[0]) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json({
    textEn: data[0].text_en,
    textZh: data[0].text_zh,
  });
}
