"use client";

import { cn } from "@/lib/utils";

interface AnimatedBirdProps {
  stage?: string;
  className?: string;
}

export function AnimatedBird({ stage = "idle", className }: AnimatedBirdProps) {
  // Different animations based on stage
  const getAnimationClass = () => {
    switch (stage) {
      case "searching":
      case "strategizing":
        return "animate-bird-search";
      case "retrieving":
      case "reading":
        return "animate-bird-read";
      case "thinking":
      case "analyzing":
      case "comparing":
        return "animate-bird-think";
      case "executing":
        return "animate-bird-fly";
      case "synthesizing":
      case "responding":
        return "animate-bird-happy";
      default:
        return "animate-bird-idle";
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Elegant minimal bird silhouette */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-full h-full", getAnimationClass())}
      >
        {/* Simple elegant bird shape - abstract swift/swallow silhouette */}
        <path
          d="M4 16 Q8 12 16 14 Q20 14.5 24 12 L28 10 Q24 14 20 15 Q16 16 12 18 Q8 20 4 16 Z"
          className="fill-primary"
        />
        {/* Wing accent */}
        <path
          d="M10 15 Q14 13 18 14 Q14 15 10 17 Z"
          className="fill-primary/60"
          style={{
            transformOrigin: "14px 15px",
            animation: stage === "executing" ? "wingFlap 0.2s ease-in-out infinite" : undefined
          }}
        />
      </svg>
    </div>
  );
}
