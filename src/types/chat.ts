export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinkingSteps?: ThinkingStep[];
  iterations?: number;
  currentStage?: Stage;
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
  type: "thinking" | "tool_call" | "tool_result" | "text" | "done" | "error" | "stage";
  data: unknown;
}

export interface SelectedCase {
  citation: string;
  url: string;
}
