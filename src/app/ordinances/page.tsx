"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AuthModal } from "@/components/auth/AuthModal";
import { createClient } from "@/lib/supabase/client";
import ordinancesConfig from "@/data/ordinances-config.json";

export default function OrdinancesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Create supabase client once to avoid infinite loops in useEffects
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || "");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      setUserEmail(session?.user?.email || "");
      if (session?.user) {
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
  return (
    <div className="min-h-screen bg-background">
      <Header
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignOut={handleSignOut}
        onSignIn={() => setShowAuthModal(true)}
        navigationLink={{ href: "/", label: "Chat" }}
        maxWidth="7xl"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">
            Hong Kong Ordinances
          </h1>
          <p className="text-lg font-serif text-muted-foreground max-w-3xl">
            Browse and research Hong Kong legislation with AI-powered case law analysis.
            Each ordinance includes full statutory text and relevant case annotations.
          </p>
        </div>

        {/* Ordinances Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordinancesConfig.ordinances.map((ord) => (
            <Link
              key={ord.cap}
              href={`/cap/${ord.cap}`}
              className="group block p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
            >
              {/* Cap Number */}
              <div className="text-xs font-mono text-muted-foreground mb-2">
                Cap. {ord.cap}
              </div>

              {/* English Title */}
              <h2 className="text-lg font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {ord.title}
              </h2>

              {/* Chinese Title */}
              <p className="text-sm font-serif text-muted-foreground mb-4">
                {ord.titleZh}
              </p>

              {/* Example Questions Preview */}
              {ord.exampleQuestions && ord.exampleQuestions.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-serif text-muted-foreground italic">
                    Example: {ord.exampleQuestions[0]}
                  </p>
                </div>
              )}

              {/* Arrow Indicator */}
              <div className="mt-4 flex items-center gap-2 text-sm font-serif text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore ordinance</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-primary/5 border border-primary/20 rounded-xl">
            <h3 className="text-xl font-serif font-semibold text-foreground">
              Need deeper legal research?
            </h3>
            <p className="text-sm font-serif text-muted-foreground max-w-md">
              Access our full AI-powered case law research platform with conversation history,
              multiple research modes, and unlimited search.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground font-serif font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Research Platform
            </Link>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      )}
    </div>
  );
}
