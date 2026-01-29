import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLAN_CONFIG = {
  free: { limit: 10, label: "Free" },
  pro: { limit: 100, label: "Pro" },
  max: { limit: 500, label: "Max" },
} as const;

export function getPlanFromPriceId(priceId: string): "pro" | "max" | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_MAX_PRICE_ID) return "max";
  return null;
}
