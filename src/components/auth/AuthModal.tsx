"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "signin" | "signup";
  onSuccess?: () => void;
}

export function AuthModal({ onClose, initialMode = "signin", onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          },
        });
        if (error) throw error;
        // Fire Google Ads conversion event for signup
        if (typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag("event", "conversion", { send_to: "AW-17918140153/NmMfCICd7PwbEPm9hOBC" });
        }
        setMessage("Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <FeatherIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-serif font-semibold text-foreground">
            {isForgotPassword ? "Reset your password" : isSignUp ? "Create an account" : "Sign in to Casebird"}
          </h2>
          <p className="font-serif text-sm text-muted-foreground mt-1">
            {isForgotPassword
              ? "Enter your email to receive a password reset link"
              : "Sign in to save your research and chat history"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-serif text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-serif text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-serif text-foreground">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs font-serif text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-serif text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="At least 6 characters"
              />
            </div>
          )}

          {error && (
            <p className="text-sm font-serif text-red-500">{error}</p>
          )}
          {message && (
            <p className="text-sm font-serif text-primary">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-serif text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isForgotPassword
                ? "Send reset link"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm font-serif text-muted-foreground mt-4">
          {isForgotPassword ? (
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setError("");
                setMessage("");
              }}
              className="text-primary hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setMessage("");
                }}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
