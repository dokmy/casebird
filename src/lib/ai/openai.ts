import OpenAI from "openai";
import type { AIAdapter, AIMessage, AIPart, AIGenerateOptions, AIToolDefinition, NormalizedPart } from "./types";

const MODELS = {
  triage: "gpt-5.4-nano",
  pipeline: "gpt-5.4-mini",
};

// Convert provider-agnostic messages to OpenAI format
function toOpenAIMessages(
  messages: AIMessage[],
  systemInstruction?: string
): Array<OpenAI.Chat.ChatCompletionMessageParam> {
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemInstruction) {
    result.push({ role: "system", content: systemInstruction });
  }

  // Track tool_call_ids: when we see functionCall parts from model,
  // we assign synthetic IDs. When we see functionResponse parts from user,
  // we match them by order.
  let toolCallCounter = 0;
  // Queue of tool_call_ids from the last assistant message's tool_calls
  let pendingToolCallIds: string[] = [];

  for (const msg of messages) {
    if (msg.role === "model") {
      // Check if this message has function calls
      const functionCalls = msg.parts.filter((p) => p.type === "functionCall");
      const textParts = msg.parts.filter((p) => p.type === "text");
      const textContent = textParts.map((p) => (p as { text: string }).text).join("");

      if (functionCalls.length > 0) {
        // Assistant message with tool_calls
        const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = functionCalls.map((fc) => {
          const id = fc.toolCallId || `call_${toolCallCounter++}`;
          pendingToolCallIds.push(id);
          return {
            id,
            type: "function" as const,
            function: {
              name: (fc as { name: string }).name,
              arguments: JSON.stringify((fc as { args: Record<string, unknown> }).args),
            },
          };
        });
        result.push({
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCalls,
        });
      } else {
        // Plain assistant message
        result.push({
          role: "assistant",
          content: textContent || null,
        });
        pendingToolCallIds = [];
      }
    } else {
      // User message
      const functionResponses = msg.parts.filter((p) => p.type === "functionResponse");
      const textParts = msg.parts.filter((p) => p.type === "text");

      // Add function responses as tool messages
      for (let i = 0; i < functionResponses.length; i++) {
        const fr = functionResponses[i] as { name: string; result: string; toolCallId?: string };
        const toolCallId = fr.toolCallId || pendingToolCallIds[i] || `call_${toolCallCounter++}`;
        result.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: fr.result,
        });
      }

      // Add text parts as user message
      if (textParts.length > 0) {
        const textContent = textParts.map((p) => (p as { text: string }).text).join("\n");
        result.push({ role: "user", content: textContent });
      }

      if (functionResponses.length > 0) {
        pendingToolCallIds = [];
      }
    }
  }

  return result;
}

// Convert provider-agnostic tool definitions to OpenAI format
function toOpenAITools(tools: AIToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function createOpenAIAdapter(): AIAdapter {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  return {
    async generateContent(messages, model, options) {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: MODELS[model],
        messages: toOpenAIMessages(messages, options.systemInstruction),
        stream: false,
      };
      if (options.tools) params.tools = toOpenAITools(options.tools);
      if (options.temperature !== undefined) params.temperature = options.temperature;
      if (options.toolChoice === "required") {
        params.tool_choice = "required";
      } else if (options.toolChoice === "none") {
        params.tool_choice = "none";
      }
      // OpenAI doesn't have thinkingConfig — we just skip it

      const response = await client.chat.completions.create(params);
      const choice = response.choices[0];
      const text = choice.message.content || null;
      const parts: NormalizedPart[] = [];
      const rawParts: AIPart[] = [];

      if (text) {
        parts.push({ type: "text", text });
        rawParts.push({ type: "text", text });
      }

      if (choice.message.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tcAny = tc as any;
          const fn = tcAny.function || tcAny;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments || "{}");
          } catch { /* empty */ }
          const name = fn.name || "";
          const id = tcAny.id || "";
          parts.push({ type: "functionCall", name, args, toolCallId: id });
          rawParts.push({ type: "functionCall", name, args, toolCallId: id });
        }
      }

      return { text, parts, rawParts };
    },

    async *generateContentStream(messages, model, options) {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: MODELS[model],
        messages: toOpenAIMessages(messages, options.systemInstruction),
        stream: true,
      };
      if (options.tools) params.tools = toOpenAITools(options.tools);
      if (options.temperature !== undefined) params.temperature = options.temperature;
      if (options.toolChoice === "required") {
        params.tool_choice = "required";
      } else if (options.toolChoice === "none") {
        params.tool_choice = "none";
      }

      const stream = await client.chat.completions.create(params);

      // OpenAI streams tool calls in pieces — accumulate them
      const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();

      for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        const normalized: NormalizedPart[] = [];

        // Text content
        if (delta.content) {
          normalized.push({ type: "text", text: delta.content });
        }

        // Tool calls (streamed in pieces)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallAccumulators.has(idx)) {
              toolCallAccumulators.set(idx, { id: tc.id || "", name: "", arguments: "" });
            }
            const acc = toolCallAccumulators.get(idx)!;
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
          }
        }

        // Check if stream is done (finish_reason) — flush accumulated tool calls
        if (chunk.choices[0]?.finish_reason === "tool_calls" || chunk.choices[0]?.finish_reason === "stop") {
          for (const [, acc] of toolCallAccumulators) {
            if (acc.name) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(acc.arguments);
              } catch { /* empty */ }
              normalized.push({ type: "functionCall", name: acc.name, args, toolCallId: acc.id });
            }
          }
          toolCallAccumulators.clear();
        }

        if (normalized.length > 0) yield normalized;
      }

      // Flush any remaining tool calls (safety net)
      if (toolCallAccumulators.size > 0) {
        const normalized: NormalizedPart[] = [];
        for (const [, acc] of toolCallAccumulators) {
          if (acc.name) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(acc.arguments);
            } catch { /* empty */ }
            normalized.push({ type: "functionCall", name: acc.name, args, toolCallId: acc.id });
          }
        }
        if (normalized.length > 0) yield normalized;
      }
    },
  };
}
