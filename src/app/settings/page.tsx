"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [outputLanguage, setOutputLanguage] = useState<"EN" | "TC">("EN");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan: string;
    message_count: number;
    message_limit: number;
    current_period_end: string | null;
    stripe_customer_id: string | null;
  } | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      const [settingsRes, subRes] = await Promise.all([
        supabase
          .from("user_settings")
          .select("output_language")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("plan, message_count, message_limit, current_period_end, stripe_customer_id")
          .eq("user_id", user.id)
          .single(),
      ]);
      if (settingsRes.data) {
        setOutputLanguage(settingsRes.data.output_language as "EN" | "TC");
      }
      if (subRes.data) {
        setSubscription(subRes.data);
      }
      setLoading(false);
    };
    load();
  }, [supabase]);

  const handleChange = async (lang: "EN" | "TC") => {
    setOutputLanguage(lang);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, output_language: lang }, { onConflict: "user_id" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <FeatherIcon className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-serif text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </Link>
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            Settings
          </h1>
        </div>

        {/* Output Language */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-serif font-medium text-foreground mb-1">
              AI Output Language
            </h2>
            <p className="text-xs font-serif text-muted-foreground mb-4">
              Choose the language Casebird uses to respond to your queries. This does not affect the app interface.
            </p>
            <div className="flex gap-3">
              {([
                { value: "EN" as const, label: "English", desc: "Responses in English" },
                { value: "TC" as const, label: "繁體中文", desc: "以繁體中文回覆" },
              ]).map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange(option.value)}
                  className={cn(
                    "flex-1 p-4 rounded-lg border-2 text-left transition-all",
                    outputLanguage === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-accent/30"
                  )}
                >
                  <div className="font-serif text-sm font-medium text-foreground">
                    {option.label}
                  </div>
                  <div className="font-serif text-xs text-muted-foreground mt-0.5">
                    {option.desc}
                  </div>
                </button>
              ))}
            </div>
            {saving && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-serif text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </div>
            )}
          </div>

          {/* Subscription */}
          <div className="pt-6 border-t border-border">
            <h2 className="text-sm font-serif font-medium text-foreground mb-1">
              Subscription
            </h2>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div>
                    <div className="font-serif text-sm font-medium text-foreground capitalize">
                      {subscription.plan} plan
                    </div>
                    <div className="font-serif text-xs text-muted-foreground mt-0.5">
                      {subscription.message_count}/{subscription.message_limit} messages used
                      {subscription.current_period_end && (
                        <> · Resets {new Date(subscription.current_period_end).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  {/* Usage bar */}
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        subscription.message_count >= subscription.message_limit * 0.8
                          ? "bg-orange-500"
                          : "bg-primary"
                      )}
                      style={{ width: `${Math.min((subscription.message_count / subscription.message_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {subscription.stripe_customer_id ? (
                  <button
                    onClick={async () => {
                      setLoadingPortal(true);
                      try {
                        const res = await fetch("/api/stripe/portal", { method: "POST" });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                      } catch (e) {
                        console.error("Portal error:", e);
                      }
                      setLoadingPortal(false);
                    }}
                    disabled={loadingPortal}
                    className="text-sm font-serif text-primary hover:underline disabled:opacity-50"
                  >
                    {loadingPortal ? "Loading..." : "Manage billing"}
                  </button>
                ) : subscription.plan === "free" ? (
                  <p className="text-xs font-serif text-muted-foreground">
                    Upgrade to Pro or Max for more messages.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs font-serif text-muted-foreground">
                No subscription data available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
