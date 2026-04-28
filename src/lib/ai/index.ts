import type { AIAdapter, AIProvider } from "./types";
import { createGeminiAdapter } from "./gemini";
import { createOpenAIAdapter } from "./openai";

export function createAIAdapter(provider: AIProvider): AIAdapter {
  switch (provider) {
    case "openai":
      return createOpenAIAdapter();
    case "gemini":
    default:
      return createGeminiAdapter();
  }
}

export type { AIProvider, AIAdapter, AIMessage, AIPart, AIToolDefinition, NormalizedPart, AIGenerateOptions } from "./types";
