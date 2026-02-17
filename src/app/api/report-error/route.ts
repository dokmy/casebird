import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { url, message } = await request.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const urlPath = url ? new URL(url).pathname : "unknown";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Casebird <noreply@casebird.ai>",
      to: "adrien@stepone.agency",
      subject: `[Casebird] Error Report — ${urlPath}`,
      text: `Error report from ${url || "unknown page"}\n\n${message.trim()}\n\nTime: ${new Date().toISOString()}`,
    }),
  });

  return NextResponse.json({ ok: true });
}
