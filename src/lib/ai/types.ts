// Shared types for AI provider abstraction

export type AIProvider = "gemini" | "openai";

// Provider-agnostic message format used throughout the pipeline
export interface AIMessage {
  role: "user" | "model";
  parts: AIPart[];
}

export type AIPart =
  | { type: "text"; text: string; thought?: boolean }
  | { type: "functionCall"; name: string; args: Record<string, unknown>; toolCallId?: string }
  | { type: "functionResponse"; name: string; result: string; toolCallId?: string };

// Provider-agnostic tool definition (JSON Schema based)
export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// What a streaming chunk looks like after normalization
export interface NormalizedPart {
  type: "text" | "thought" | "functionCall";
  text?: string;
  name?: string;
  args?: Record<string, unknown>;
  toolCallId?: string;
}

// Options for generating content
export interface AIGenerateOptions {
  systemInstruction?: string;
  tools?: AIToolDefinition[];
  toolChoice?: "auto" | "required" | "none";
  thinkingLevel?: "low" | "medium" | "high";
  includeThoughts?: boolean;
  temperature?: number;
}

// The adapter interface each provider implements
export interface AIAdapter {
  // Non-streaming generation (triage, filter)
  generateContent(
    messages: AIMessage[],
    model: "triage" | "pipeline",
    options: AIGenerateOptions
  ): Promise<{ text: string | null; parts: NormalizedPart[]; rawParts: AIPart[] }>;

  // Streaming generation (search, read, answer, direct)
  generateContentStream(
    messages: AIMessage[],
    model: "triage" | "pipeline",
    options: AIGenerateOptions
  ): AsyncIterable<NormalizedPart[]>;

  // Convert provider-agnostic messages to native format for conversation building
  // (used internally by the adapter)
}
