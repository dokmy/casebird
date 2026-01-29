"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, ExternalLink } from "lucide-react";

interface CaseViewerProps {
  url: string;
  citation: string;
  onClose: () => void;
}

export function CaseViewer({ url, citation, onClose }: CaseViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clean and normalize the URL - point directly at HKLII (no proxy needed)
  // HKLII's CSP frame-ancestors * overrides X-Frame-Options in modern browsers
  const cleanUrl = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

  const handleOpenExternal = () => {
    window.open(cleanUrl, "_blank", "noopener,noreferrer");
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <Header
            citation={citation}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(false)}
            onOpenExternal={handleOpenExternal}
            onClose={onClose}
          />
          <div className="flex-1">
            <iframe
              src={cleanUrl}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title={citation}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l bg-background">
      <Header
        citation={citation}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(true)}
        onOpenExternal={handleOpenExternal}
        onClose={onClose}
      />
      <div className="flex-1 overflow-hidden">
        <iframe
          src={cleanUrl}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title={citation}
        />
      </div>
    </div>
  );
}

interface HeaderProps {
  citation: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenExternal: () => void;
  onClose: () => void;
}

function Header({
  citation,
  isFullscreen,
  onToggleFullscreen,
  onOpenExternal,
  onClose,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
      <h2 className="font-semibold text-sm truncate flex-1 mr-4">{citation}</h2>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenExternal}
          className="h-8 w-8"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-8 w-8"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          title="Close"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
