"use client";

import { useState } from "react";
import { X, Zap, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  currentPlan: string;
  messageCount: number;
  messageLimit: number;
  onClose: () => void;
}

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "HK$399",
    period: "/month",
    messages: "100 messages/month",
    icon: Zap,
    features: ["100 messages per month", "All research modes", "Full case library access"],
  },
  {
    id: "max" as const,
    name: "Max",
    price: "HK$999",
    period: "/month",
    messages: "500 messages/month",
    icon: Crown,
    features: ["500 messages per month", "All research modes", "Full case library access", "Priority support"],
  },
];

export function UpgradeModal({ currentPlan, messageCount, messageLimit, onClose }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: "pro" | "max") => {
    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-serif font-semibold text-foreground">Upgrade your plan</h2>
            <p className="text-sm font-serif text-muted-foreground mt-1">
              You&apos;ve used {messageCount}/{messageLimit} messages
              {currentPlan === "free" && " on the free tier"}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          {PLANS.filter((p) => {
            // Don't show current plan or lower plans
            if (currentPlan === "pro") return p.id === "max";
            return true;
          }).map((plan) => (
            <div
              key={plan.id}
              className="border border-border rounded-lg p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <plan.icon className="w-5 h-5 text-primary" />
                  <span className="font-serif font-semibold text-foreground">{plan.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-semibold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm font-serif text-muted-foreground flex items-center gap-2">
                    <span className="text-primary">·</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loadingPlan !== null}
                className={cn(
                  "w-full py-2.5 rounded-lg font-serif text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Subscribe to ${plan.name}`
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
