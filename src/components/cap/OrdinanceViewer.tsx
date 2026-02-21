"use client";

import { useState } from "react";

interface Section {
  id: string;
  title: string;
  titleZh?: string;
  subpath: string;
}

interface Part {
  id: string;
  title: string;
  titleZh?: string;
  sections: Section[];
}

interface Schedule {
  id: string;
  title: string;
  titleZh?: string;
  subpath: string;
  textEn?: string;
  textZh?: string;
}

interface OrdinanceData {
  cap: string;
  title: string;
  titleZh?: string;
  parts: Part[];
  schedules?: Schedule[];
}

interface OrdinanceViewerProps {
  data: OrdinanceData;
  onSectionClick?: (section: Section, part: Part) => void;
  language?: "en" | "zh";
}

export function OrdinanceViewer({ data, onSectionClick, language = "en" }: OrdinanceViewerProps) {
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const togglePart = (partId: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  const handleSectionClick = (section: Section, part: Part) => {
    setSelectedSection(section.id);
    onSectionClick?.(section, part);
  };

  return (
    <div className="h-full overflow-y-auto bg-background border-r border-border">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-6 z-10">
        <div className="text-xs font-mono text-muted-foreground mb-2">
          Cap. {data.cap}
        </div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">
          {data.title}
        </h1>
        {data.titleZh && (
          <p className="text-sm font-serif text-muted-foreground mt-1">
            {data.titleZh}
          </p>
        )}
      </div>

      {/* Table of Contents */}
      <div className="p-4">
        <div className="space-y-2">
          {data.parts.map((part) => {
            const isExpanded = expandedParts.has(part.id);

            return (
              <div key={part.id} className="border border-border rounded-lg overflow-hidden">
                {/* Part Header */}
                <button
                  onClick={() => togglePart(part.id)}
                  className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {part.id}
                    </div>
                    <div className="text-sm font-serif font-semibold text-foreground">
                      {language === "zh" && part.titleZh ? part.titleZh : part.title}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isExpanded ? "▼" : "▶"}
                  </div>
                </button>

                {/* Sections */}
                {isExpanded && (
                  <div className="bg-background">
                    {part.sections.map((section) => {
                      const isSelected = selectedSection === section.id;

                      return (
                        <button
                          key={section.id}
                          onClick={() => handleSectionClick(section, part)}
                          className={`w-full px-4 py-2 text-left hover:bg-muted/30 transition-colors border-t border-border ${
                            isSelected ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="text-xs font-mono text-muted-foreground">
                            {section.id}
                          </div>
                          <div className="text-sm font-serif text-foreground">
                            {language === "zh" && section.titleZh ? section.titleZh : section.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Schedules Section */}
          {data.schedules && data.schedules.length > 0 && (
            <div className="mt-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/30">
                  <div className="text-xs font-mono text-muted-foreground">
                    Schedules
                  </div>
                  <div className="text-sm font-serif font-semibold text-foreground">
                    {data.schedules.length} {data.schedules.length === 1 ? 'Schedule' : 'Schedules'}
                  </div>
                </div>
                <div className="bg-background">
                  {data.schedules.map((schedule) => {
                    const isSelected = selectedSection === schedule.id;
                    // Create a fake "part" for schedules to maintain the same interface
                    const schedulePart: Part = {
                      id: "Schedules",
                      title: "Schedules",
                      titleZh: "附表",
                      sections: []
                    };

                    return (
                      <button
                        key={schedule.id}
                        onClick={() => {
                          setSelectedSection(schedule.id);
                          onSectionClick?.(schedule as any, schedulePart);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-muted/30 transition-colors border-t border-border ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <div className="text-xs font-mono text-muted-foreground">
                          {schedule.id}
                        </div>
                        <div className="text-sm font-serif text-foreground">
                          {language === "zh" && schedule.titleZh ? schedule.titleZh : schedule.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
