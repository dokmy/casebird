"use client";

import { cn } from "@/lib/utils";

interface FeatherIconProps {
  className?: string;
}

export function FeatherIcon({ className }: FeatherIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-6 h-6", className)}
    >
      {/* Elegant quill feather - refined and sophisticated */}
      <path
        d="M20.5 2.5C16 3 12.5 6 10 10C8 13 6.5 16.5 5.5 19.5L4 21L5.5 19.5C8 18 11 17 14 17C16.5 17 18.5 15.5 19.5 13.5C20.5 11.5 21 9 21 6.5C21 4.5 21 3 20.5 2.5Z"
        className="fill-primary"
        fillOpacity="0.15"
      />
      <path
        d="M20.5 2.5C16 3 12.5 6 10 10C8 13 6.5 16.5 5.5 19.5L4 21"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10C12 9 14.5 9 17 10"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.5 13C10.5 12.5 13 12.5 15.5 14"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 16C9 15.5 11 15.5 13.5 17"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
