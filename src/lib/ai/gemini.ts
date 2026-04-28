import { GoogleGenAI, Type, ThinkingLevel, FunctionCallingConfigMode } from "@google/genai";
import type { AIAdapter, AIMessage, AIPart, AIGenerateOptions, AIToolDefinition, NormalizedPart } from "./types";

const MODELS = {
  triage: "gemini-2.0-flash",
  pipeline: "gemini-3.1-flash-lite-preview",
};

const THINKING_MAP: Record<string, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

// Convert provider-agnostic messages to Gemini format
function toGeminiContents(messages: AIMessage[]): Array<{ role: string; parts: unknown[] }> {
  return messages.map((msg) => ({
    role: msg.role === "model" ? "model" : "user",
    parts: msg.parts.map((part) => {
      switch (part.type) {
        case "text":
          return { text: part.text };
        case "functionCall":
          return { functionCall: { name: part.name, args: part.args } };
        case "functionResponse":
          return { functionResponse: { name: part.name, response: { result: part.result } } };
      }
    }),
  }));
}

// Convert provider-agnostic tool definitions to Gemini format
function toGeminiTools(tools: AIToolDefinition[]) {
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }];
}

// Normalize a Gemini part to our common format
function normalizeGeminiPart(part: Record<string, unknown>): NormalizedPart | null {
  if (part.thought && part.text) {
    return { type: "thought", text: part.text as string };
  }
  if (part.text && !part.thought) {
    return { type: "text", text: part.text as string };
  }
  if (part.functionCall) {
    const fc = part.functionCall as { name: string; args: Record<string, unknown> };
    return { type: "functionCall", name: fc.name, args: fc.args };
  }
  return null;
}

// Convert Gemini raw parts back to our AIPart format for conversation history
function geminiPartsToAIParts(rawParts: unknown[]): AIPart[] {
  const result: AIPart[] = [];
  for (const part of rawParts) {
    const p = part as Record<string, unknown>;
    if (p.text) {
      result.push({ type: "text", text: p.text as string, thought: p.thought as boolean | undefined });
    } else if (p.functionCall) {
      const fc = p.functionCall as { name: string; args: Record<string, unknown> };
      result.push({ type: "functionCall", name: fc.name, args: fc.args });
    } else if (p.functionResponse) {
      const fr = p.functionResponse as { name: string; response: { result: string } };
      result.push({ type: "functionResponse", name: fr.name, result: fr.response.result });
    }
  }
  return result;
}

export function createGeminiAdapter(): AIAdapter {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  return {
    async generateContent(messages, model, options) {
      const config: Record<string, unknown> = {};
      if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
      if (options.tools) config.tools = toGeminiTools(options.tools);
      if (options.temperature !== undefined) config.temperature = options.temperature;
      if (options.thinkingLevel) {
        config.thinkingConfig = {
          thinkingLevel: THINKING_MAP[options.thinkingLevel] || ThinkingLevel.LOW,
          includeThoughts: options.includeThoughts ?? true,
        };
      }
      if (options.toolChoice === "required") {
        config.toolConfig = { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await ai.models.generateContent({
        model: MODELS[model],
        contents: toGeminiContents(messages) as any,
        config,
      });

      const text = response.text || null;
      const rawCandidateParts = response.candidates?.[0]?.content?.parts || [];
      const parts: NormalizedPart[] = [];
      for (const part of rawCandidateParts) {
        const normalized = normalizeGeminiPart(part as Record<string, unknown>);
        if (normalized) parts.push(normalized);
      }

      return { text, parts, rawParts: geminiPartsToAIParts(rawCandidateParts as unknown[]) };
    },

    async *generateContentStream(messages, model, options) {
      const config: Record<string, unknown> = {};
      if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
      if (options.tools) config.tools = toGeminiTools(options.tools);
      if (options.temperature !== undefined) config.temperature = options.temperature;
      if (options.thinkingLevel) {
        config.thinkingConfig = {
          thinkingLevel: THINKING_MAP[options.thinkingLevel] || ThinkingLevel.LOW,
          includeThoughts: options.includeThoughts ?? true,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await ai.models.generateContentStream({
        model: MODELS[model],
        contents: toGeminiContents(messages) as any,
        config,
      });

      for await (const chunk of response) {
        const candidate = (chunk as { candidates?: Array<{ content?: { parts?: Array<unknown> } }> }).candidates?.[0];
        if (!candidate?.content?.parts) continue;

        const normalized: NormalizedPart[] = [];
        for (const part of candidate.content.parts) {
          const n = normalizeGeminiPart(part as Record<string, unknown>);
          if (n) normalized.push(n);
        }
        if (normalized.length > 0) yield normalized;
      }
    },
  };
}

// Helper to convert raw Gemini parts from streaming back to AIParts for conversation history
export { geminiPartsToAIParts };
