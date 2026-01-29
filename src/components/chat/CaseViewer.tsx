"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2, ExternalLink, ChevronDown } from "lucide-react";

interface CaseViewerProps {
  url: string;
  citation: string;
  onClose: () => void;
  mobile?: boolean;
}

export function CaseViewer({ url, citation, onClose, mobile }: CaseViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const cleanUrl = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

  const handleOpenExternal = () => {
    window.open(cleanUrl, "_blank", "noopener,noreferrer");
  };

  // Mobile bottom sheet
  if (mobile) {
    const handleTouchStart = (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY;
      setDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!dragging || !sheetRef.current) return;
      const deltaY = e.touches[0].clientY - startY.current;
      if (deltaY > 0) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      setDragging(false);
      if (!sheetRef.current) return;
      const deltaY = e.changedTouches[0].clientY - startY.current;
      if (deltaY > 120) {
        onClose();
      } else {
        sheetRef.current.style.transform = "translateY(0)";
      }
    };

    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 h-[85vh] bg-background rounded-t-2xl flex flex-col transition-transform duration-200 ease-out"
          style={{ transform: "translateY(0)" }}
        >
          {/* Drag handle */}
          <div
            className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <h2 className="font-semibold text-sm truncate flex-1 mr-4">{citation}</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenExternal}
                className="h-8 w-8"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                title="Close"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* iframe */}
          <div className="flex-1 overflow-hidden">
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

  // Desktop fullscreen
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

  // Desktop side panel
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
