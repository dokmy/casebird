"use client";

import { useState } from "react";
import { Flag, X, Send, Loader2, Check } from "lucide-react";

export function ErrorReportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/report-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: window.location.href,
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setStatus("idle");
      }, 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-10 h-10 rounded-full bg-muted border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        aria-label="Report an error"
        title="Report an error"
      >
        <Flag className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 bg-background border border-border rounded-lg shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-serif text-sm font-medium text-foreground">
          Report an error
        </span>
        <button
          onClick={() => {
            setOpen(false);
            setMessage("");
            setStatus("idle");
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the error (e.g. wrong case name, incorrect annotation...)"
          className="w-full h-24 px-3 py-2 text-sm font-serif bg-muted/30 border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
          disabled={status === "sending" || status === "sent"}
        />
        {status === "error" && (
          <p className="text-xs text-red-500 mt-1 font-serif">
            Failed to send. Please try again.
          </p>
        )}
        {status === "sent" ? (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-green-600 font-serif">
            <Check className="w-4 h-4" />
            Sent. Thank you!
          </div>
        ) : (
          <button
            type="submit"
            disabled={!message.trim() || status === "sending"}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-serif font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {status === "sending" ? "Sending..." : "Send report"}
          </button>
        )}
      </form>
    </div>
  );
}
