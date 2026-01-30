import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const email = payload.record?.email;
  if (!email) {
    return NextResponse.json({ error: "No email in payload" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "No Resend key" }, { status: 500 });
  }

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

  return NextResponse.json({ ok: true });
}
