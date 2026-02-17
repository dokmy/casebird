"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SelectedCase {
  url: string;
  citation: string;
}

interface CaseViewerContextValue {
  selectedCase: SelectedCase | null;
  openCase: (url: string, citation: string) => void;
  closeCase: () => void;
}

const CaseViewerContext = createContext<CaseViewerContextValue>({
  selectedCase: null,
  openCase: () => {},
  closeCase: () => {},
});

export function useCaseViewer() {
  return useContext(CaseViewerContext);
}

export function CaseViewerProvider({ children }: { children: React.ReactNode }) {
  const [selectedCase, setSelectedCase] = useState<SelectedCase | null>(null);

  const openCase = useCallback((url: string, citation: string) => {
    setSelectedCase({ url, citation });
  }, []);

  const closeCase = useCallback(() => {
    setSelectedCase(null);
  }, []);

  return (
    <CaseViewerContext.Provider value={{ selectedCase, openCase, closeCase }}>
      {children}
    </CaseViewerContext.Provider>
  );
}
