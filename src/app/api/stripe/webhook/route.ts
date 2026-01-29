import { stripe, getPlanFromPriceId, PLAN_CONFIG } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client for webhook (no user auth context)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPeriodEnd(subscription: { items: { data: Array<{ current_period_end: number }> } }): string | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (!periodEnd) return null;
  return new Date(periodEnd * 1000).toISOString();
}

function getSubscriptionIdFromInvoice(invoice: Record<string, unknown>): string | null {
  // Stripe v20: invoice.parent.subscription_details.subscription
  const parent = invoice.parent as { subscription_details?: { subscription?: string | { id: string } } } | null;
  const sub = parent?.subscription_details?.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;

        const userId = session.metadata?.user_id;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId) || "pro";

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            plan,
            status: "active",
            message_count: 0,
            message_limit: PLAN_CONFIG[plan].limit,
            current_period_end: getPeriodEnd(subscription),
          },
          { onConflict: "user_id" }
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice as unknown as Record<string, unknown>);
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = invoice.customer as string;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              message_count: 0,
              status: "active",
              current_period_end: getPeriodEnd(subscription),
            })
            .eq("user_id", sub.user_id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        if (!plan) break;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          // Determine status: if user scheduled cancellation, mark as canceled
          let status: string;
          if ((subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end) {
            status = "canceled";
          } else if (subscription.status === "active") {
            status = "active";
          } else if (subscription.status === "past_due") {
            status = "past_due";
          } else {
            status = "active";
          }

          const updateData: Record<string, unknown> = {
            plan,
            message_limit: PLAN_CONFIG[plan].limit,
            status,
            current_period_end: getPeriodEnd(subscription),
          };

          // If cancellation was reversed (user resubscribed), restore active
          if (status === "canceled") {
            // Keep current plan until period ends
          }

          await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("user_id", sub.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          await supabase
            .from("subscriptions")
            .update({
              plan: "free",
              status: "canceled",
              message_limit: PLAN_CONFIG.free.limit,
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq("user_id", sub.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
