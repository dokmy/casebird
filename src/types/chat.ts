export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinkingSteps?: ThinkingStep[];
  iterations?: number;
  currentStage?: Stage;
  caseUrls?: Record<string, string>;
  followUpQuestions?: string[];
}

export interface Stage {
  stage: string;
  description: string;
}

export interface ThinkingStep {
  type:
    | "thought"
    | "iteration"
    | "reasoning"
    | "continue"
    | "limit"
    | "tool_call"
    | "tool_result";
  content: string;
  iteration?: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolSummary?: string;
}

export interface StreamEvent {
  type: "thinking" | "tool_call" | "tool_result" | "text" | "done" | "error" | "stage" | "case_urls" | "follow_up_questions";
  data: unknown;
}

export interface SelectedCase {
  citation: string;
  url: string;
}

export type ResearchMode = "fast" | "normal" | "deep";

export type CaseLanguage = "any" | "EN" | "TC";

export type UserRole = "insurance" | "lawyer";

export const RESEARCH_MODE_CONFIG: Record<ResearchMode, { maxIterations: number; label: string; description: string }> = {
  fast: { maxIterations: 3, label: "Fast", description: "Quick answers" },
  normal: { maxIterations: 5, label: "Normal", description: "Balanced research" },
  deep: { maxIterations: 10, label: "Deep", description: "Thorough analysis" },
};
