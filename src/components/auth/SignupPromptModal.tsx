"use client";

import { X, Sparkles, BookOpen, Clock, Shield } from "lucide-react";

interface SignupPromptModalProps {
  onClose: () => void;
  onSignUp: () => void;
}

export function SignupPromptModal({ onClose, onSignUp }: SignupPromptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">
              Continue Your Research
            </h2>
            <p className="text-sm font-serif text-muted-foreground mt-1">
              Sign up to unlock full access to Casebird
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Free Credits Highlight */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-serif font-semibold text-foreground">
                Start with 10 free messages
              </span>
            </div>
            <p className="text-sm font-serif text-muted-foreground">
              No credit card required. Explore Hong Kong case law with AI-powered research.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-serif font-medium text-foreground text-sm">
                  Deep Legal Research
                </h3>
                <p className="text-sm font-serif text-muted-foreground mt-0.5">
                  Access our full database of Hong Kong case law with AI-powered semantic search
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-serif font-medium text-foreground text-sm">
                  Save Your Conversations
                </h3>
                <p className="text-sm font-serif text-muted-foreground mt-0.5">
                  Keep track of your research history and revisit past queries anytime
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-serif font-medium text-foreground text-sm">
                  Multiple Research Modes
                </h3>
                <p className="text-sm font-serif text-muted-foreground mt-0.5">
                  Choose between Fast, Normal, or Deep research depending on your needs
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2">
            <button
              onClick={onSignUp}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-serif text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign up for free
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg font-serif text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
