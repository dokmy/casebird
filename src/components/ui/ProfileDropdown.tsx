"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";

interface ProfileDropdownProps {
  userEmail?: string;
  onSignOut: () => void;
}

export function ProfileDropdown({ userEmail, onSignOut }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get user initials from email
  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
        title={userEmail || "Profile"}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-serif font-semibold text-primary">
            {getInitials(userEmail)}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {/* User Email */}
          {userEmail && (
            <div className="px-4 py-3 border-b border-border">
              <div className="text-xs font-serif text-muted-foreground">Signed in as</div>
              <div className="text-sm font-serif text-foreground truncate">{userEmail}</div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href={`/settings?returnUrl=${encodeURIComponent(pathname || "/")}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-accent/50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-serif text-foreground">Settings</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-serif text-foreground">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
