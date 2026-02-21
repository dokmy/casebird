"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, ChevronDown, MessageSquare, BookOpen } from "lucide-react";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { ProfileDropdown } from "@/components/ui/ProfileDropdown";

interface HeaderProps {
  // Auth state (passed from parent - NO supabase client here to avoid loops)
  isAuthenticated: boolean | null;
  userEmail: string;
  onSignOut: () => void;
  onSignIn: () => void;

  // Navigation
  navigationLink: {
    href: string;
    label: string;
  };

  // Mobile menu (optional, only for chat page)
  showMobileMenu?: boolean;
  onMobileMenuClick?: () => void;

  // Logo behavior
  logoHref?: string;
  onLogoClick?: () => void;

  // Container width
  maxWidth?: "full" | "7xl" | "2xl";
}

export function Header({
  isAuthenticated,
  userEmail,
  onSignOut,
  onSignIn,
  navigationLink,
  showMobileMenu = false,
  onMobileMenuClick,
  logoHref = "/",
  onLogoClick,
  maxWidth = "full",
}: HeaderProps) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModeMenu]);

  const containerClass = maxWidth === "7xl"
    ? "max-w-7xl mx-auto flex items-center justify-between gap-3"
    : maxWidth === "2xl"
    ? "max-w-2xl mx-auto flex items-center justify-between gap-3"
    : "flex items-center justify-between gap-3";

  // Determine current mode based on navigation link
  const currentMode = navigationLink.href === "/" ? "ordinance" : "chat";
  const currentModeLabel = currentMode === "chat" ? "Chat Mode" : "Ordinance Mode";
  const otherModeLabel = currentMode === "chat" ? "Ordinance Mode" : "Chat Mode";
  const CurrentModeIcon = currentMode === "chat" ? MessageSquare : BookOpen;
  const OtherModeIcon = currentMode === "chat" ? BookOpen : MessageSquare;

  return (
    <header className="border-b border-border/50 px-4 md:px-6 py-4 shrink-0">
      <div className={containerClass}>
        <div className="flex items-center gap-3">
          {/* Reserve space for menu button on mobile to prevent layout shift */}
          {showMobileMenu && (
            <div className="md:hidden w-[28px]">
              {isAuthenticated && (
                <button
                  onClick={onMobileMenuClick}
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Logo */}
          {onLogoClick ? (
            <button
              onClick={onLogoClick}
              className="flex items-center gap-2 text-xl font-serif font-medium text-foreground hover:text-primary transition-colors"
            >
              <FeatherIcon className="w-5 h-5" />
              <span className="font-serif">Casebird</span>
            </button>
          ) : (
            <Link
              href={logoHref}
              className="flex items-center gap-2 text-xl font-serif font-medium text-foreground hover:text-primary transition-colors"
            >
              <FeatherIcon className="w-5 h-5" />
              <span className="font-serif">Casebird</span>
            </Link>
          )}
        </div>

        {/* Right side: Mode Selector + Auth */}
        <div className="flex items-center gap-3">
          {/* Mode Selector Dropdown */}
          <div className="relative" ref={modeMenuRef}>
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 text-sm font-serif font-medium text-foreground transition-all shadow-sm"
            >
              <CurrentModeIcon className="w-4 h-4 text-primary" />
              <span>{currentModeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-primary ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {showModeMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-card border-2 border-border rounded-lg shadow-xl overflow-hidden z-50">
                <Link
                  href={navigationLink.href}
                  onClick={() => setShowModeMenu(false)}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-primary/5 transition-colors border-l-4 border-transparent hover:border-primary"
                >
                  <OtherModeIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-serif font-semibold text-foreground">
                      {otherModeLabel}
                    </span>
                    <span className="text-xs font-serif text-muted-foreground mt-0.5">
                      {currentMode === "chat" ? "Browse ordinances" : "General research"}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Auth section - NO auth logic here, just display based on props */}
          {isAuthenticated === true ? (
            <ProfileDropdown userEmail={userEmail} onSignOut={onSignOut} />
          ) : isAuthenticated === false ? (
            <button
              onClick={onSignIn}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-serif text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
