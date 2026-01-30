import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function notifyNewSignup(email: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Casebird <noreply@casebird.ai>",
        to: "adrien@stepone.agency",
        subject: `New Casebird signup: ${email}`,
        text: `A new user signed up for Casebird:\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
      }),
    });
  } catch {
    // Non-critical — don't block the redirect
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://casebird.ai";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (type === "signup" && data?.user?.email) {
      notifyNewSignup(data.user.email);
    }
  }

  const redirectUrl = type === "signup" ? `${appUrl}/?signup=success` : appUrl;
  return NextResponse.redirect(redirectUrl);
}
