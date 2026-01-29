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
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      const { data } = await supabase
        .from("user_settings")
        .select("output_language")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setOutputLanguage(data.output_language as "EN" | "TC");
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
        </div>
      </div>
    </div>
  );
}
