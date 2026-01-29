import { stripe, PLAN_CONFIG } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = (await request.json()) as { plan: "pro" | "max" };
    if (!plan || !["pro", "max"].includes(plan)) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = plan === "pro"
      ? process.env.STRIPE_PRO_PRICE_ID!
      : process.env.STRIPE_MAX_PRICE_ID!;

    // Get or create Stripe customer
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "active",
          message_count: 0,
          message_limit: PLAN_CONFIG.free.limit,
        },
        { onConflict: "user_id" }
      );
    }

    // Cancel existing subscription if upgrading
    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        console.error("Failed to cancel existing subscription:", e);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL}/?checkout=success`,
      cancel_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL}/?checkout=canceled`,
      metadata: { user_id: user.id, plan },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
