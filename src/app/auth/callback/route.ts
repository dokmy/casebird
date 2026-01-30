import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://casebird.ai";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = type === "signup" ? `${appUrl}/?signup=success` : appUrl;
  return NextResponse.redirect(redirectUrl);
}
