"use client";

import { CaseViewer } from "@/components/chat/CaseViewer";
import { CaseViewerProvider, useCaseViewer } from "./CaseViewerContext";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { selectedCase, closeCase } = useCaseViewer();

  return (
    <div className="flex min-h-screen">
      {/* Page content - 2/3 when case viewer open for 1/3 layout */}
      <div
        className={`min-h-screen bg-background transition-all duration-300 ${
          selectedCase ? "md:w-2/3" : "w-full"
        } w-full`}
      >
        {children}
      </div>

      {/* Desktop side panel - 1/3 width */}
      {selectedCase && (
        <div className="hidden md:block w-1/3 h-screen sticky top-0">
          <CaseViewer
            url={selectedCase.url}
            citation={selectedCase.citation}
            onClose={closeCase}
          />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {selectedCase && (
        <div className="md:hidden">
          <CaseViewer
            url={selectedCase.url}
            citation={selectedCase.citation}
            onClose={closeCase}
            mobile
          />
        </div>
      )}
    </div>
  );
}

export function CaseViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaseViewerProvider>
      <LayoutInner>{children}</LayoutInner>
    </CaseViewerProvider>
  );
}
