import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { searchCases, getCaseDetails, getCaseUrl } from "@/lib/pinecone";

const SYSTEM_PROMPT = `You are an expert legal assistant specializing in Hong Kong law. You help lawyers research case precedents, analyze legal issues, and find relevant authorities.

## CRITICAL: Reading Full Cases
**YOU MUST use getCaseDetails to read the full case text before providing detailed analysis.**
- Search results only show snippets - these are NOT enough for proper legal analysis
- After finding relevant cases with searchCases, ALWAYS call getCaseDetails to read the full judgment
- Only after reading the full case can you accurately quote and cite it

## CRITICAL: Quote Original Case Text
**You MUST quote directly from the case text to support your analysis.**
- Use blockquote format (>) for all direct quotes from cases
- Include paragraph numbers when available
- Format:
  > "The court held that the defendant's conduct..."
  > — [Case Name](url), para. 45

## CRITICAL: Case References Must Be Hyperlinks
**EVERY case citation mentioned MUST be a clickable markdown hyperlink.**
- Format: [Citation](https://www.hklii.hk/en/cases/COURT/YEAR/NUMBER)
- Example: [[2024] HKCA 620](https://www.hklii.hk/en/cases/hkca/2024/620)
- This applies to ALL case mentions - in text, tables, lists, everywhere
- Users click these links to open the case in the viewer panel

## Search Capabilities
You can search with filters:
- **court**: "hkcfa" (Court of Final Appeal), "hkca" (Court of Appeal), "hkcfi" (Court of First Instance), "hkdc" (District Court), "hkfc" (Family Court)
- **language**: "EN" (English) or "TC" (Traditional Chinese)
- **yearFrom/yearTo**: Filter by year range

Use these filters to narrow searches when the user specifies jurisdiction or time period.

## Response Format
1. Start with a brief summary answering the user's question
2. Provide detailed analysis with case citations
3. Quote relevant passages from cases using blockquotes
4. Include a summary table of relevant cases when appropriate:

| Case | Court | Year | Key Point | Outcome |
|------|-------|------|-----------|---------|
| [[2024] HKCA 620](url) | CA | 2024 | Brief description | Outcome |

## Tool Usage Guidelines
- Use searchCases with specific, targeted queries
- Make multiple searches with different angles if needed (the search supports hybrid semantic + keyword matching)
- Use filters when appropriate (court level, language, year range)
- ALWAYS use getCaseDetails before quoting or analyzing a case in depth
- You can make up to 10 tool calls per response if needed`;

const searchCasesDeclaration: FunctionDeclaration = {
  name: "searchCases",
  description:
    "Search Hong Kong legal cases using hybrid search (semantic + keyword matching). Returns case citations with relevant text snippets.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query for finding relevant cases",
      },
      numResults: {
        type: Type.NUMBER,
        description: "Number of cases to return (default 10, max 30)",
      },
      court: {
        type: Type.STRING,
        description:
          "Filter by court: hkcfa (Court of Final Appeal), hkca (Court of Appeal), hkcfi (Court of First Instance), hkdc (District Court), hkfc (Family Court)",
      },
      language: {
        type: Type.STRING,
        description:
          "Filter by language: EN (English) or TC (Traditional Chinese)",
      },
      yearFrom: {
        type: Type.NUMBER,
        description: "Filter cases from this year onwards",
      },
      yearTo: {
        type: Type.NUMBER,
        description: "Filter cases up to this year",
      },
    },
    required: ["query"],
  },
};

const getCaseDetailsDeclaration: FunctionDeclaration = {
  name: "getCaseDetails",
  description:
    "Get the full text of a specific case by its neutral citation. Use this to read the complete judgment before quoting or analyzing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      citation: {
        type: Type.STRING,
        description: "The neutral citation, e.g., '[2024] HKCA 620'",
      },
    },
    required: ["citation"],
  },
};

const tools: Tool[] = [
  {
    functionDeclarations: [searchCasesDeclaration, getCaseDetailsDeclaration],
  },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Helper to execute tools
async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ result: string; summary: string }> {
  if (name === "searchCases") {
    const typedArgs = args as {
      query: string;
      numResults?: number;
      court?: string;
      language?: "EN" | "TC";
      yearFrom?: number;
      yearTo?: number;
    };

    const searchResults = await searchCases(typedArgs.query, {
      numResults: typedArgs.numResults,
      court: typedArgs.court,
      language: typedArgs.language,
      yearFrom: typedArgs.yearFrom,
      yearTo: typedArgs.yearTo,
    });

    const result = searchResults
      .map((r) => {
        const url = getCaseUrl(r.citation);
        return `**${r.citation}** (${r.court.toUpperCase()}, ${r.year}, ${r.language})
Score: ${r.score.toFixed(4)}
URL: ${url}
Snippet: ${r.text.substring(0, 500)}${r.text.length > 500 ? "..." : ""}`;
      })
      .join("\n\n---\n\n");

    return {
      result: result || "No cases found matching the search criteria.",
      summary: `Found ${searchResults.length} cases`,
    };
  } else if (name === "getCaseDetails") {
    const typedArgs = args as { citation: string };
    const result = await getCaseDetails(typedArgs.citation);
    return {
      result,
      summary: `Retrieved full text of ${typedArgs.citation}`,
    };
  }

  return { result: `Unknown function: ${name}`, summary: "Error" };
}

export async function POST(request: Request) {
  try {
    const { message, history, mode = "normal" } = (await request.json()) as {
      message: string;
      history: Message[];
      mode?: "fast" | "normal" | "deep";
    };

    // Set max iterations based on mode
    const modeConfig = {
      fast: 3,
      normal: 5,
      deep: 10,
    };
    const maxIterations = modeConfig[mode] || 5;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Build conversation contents from history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationContents: any[] = [];

    for (const msg of history) {
      conversationContents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Add the new user message
    conversationContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
          );
        };

        // Send a stage update with emoji and description
        const sendStage = (stage: string, description: string) => {
          sendEvent("stage", { stage, description });
        };

        try {
          let iteration = 0;
          let pendingFunctionCallParts: Array<unknown> = [];
          let finalText = "";

          // Stage 1: Understanding the query
          sendStage("understanding", "Understanding your question...");

          // Initial request with thinking mode enabled
          let response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: conversationContents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: tools,
              // Enable native thinking mode
              thinkingConfig: {
                thinkingBudget: 2048,
                includeThoughts: true,
              },
            },
          });

          // Process the stream
          let modelParts: Array<unknown> = [];

          const processStream = async (
            streamResponse: AsyncIterable<unknown>
          ) => {
            modelParts = [];
            pendingFunctionCallParts = [];
            finalText = "";

            for await (const chunk of streamResponse) {
              const candidate = (
                chunk as {
                  candidates?: Array<{
                    content?: { parts?: Array<unknown> };
                  }>;
                }
              ).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                // Store ALL parts for conversation history (preserves thoughtSignature!)
                modelParts.push(part);

                const typedPart = part as {
                  thought?: boolean;
                  text?: string;
                  functionCall?: {
                    name: string;
                    args: Record<string, unknown>;
                  };
                };

                // 1. THINKING: Model's reasoning (native Gemini thinking!)
                if (typedPart.thought && typedPart.text) {
                  // Send the raw thought from Gemini
                  sendEvent("thinking", {
                    type: "thought",
                    content: typedPart.text,
                    iteration: iteration + 1,
                  });

                  // Try to extract a stage from the thought content
                  const thought = typedPart.text.toLowerCase();
                  if (thought.includes("search") || thought.includes("find") || thought.includes("look for")) {
                    sendStage("strategizing", "Creating search strategy...");
                  } else if (thought.includes("relevant") || thought.includes("promising") || thought.includes("interesting")) {
                    sendStage("analyzing", "Analyzing search results...");
                  } else if (thought.includes("full text") || thought.includes("read") || thought.includes("details")) {
                    sendStage("reading", "Reading case details...");
                  } else if (thought.includes("compare") || thought.includes("similar")) {
                    sendStage("comparing", "Comparing cases...");
                  } else if (thought.includes("answer") || thought.includes("respond") || thought.includes("enough")) {
                    sendStage("synthesizing", "Synthesizing findings...");
                  }
                }
                // 2. TEXT: Model's response text (not thinking)
                else if (typedPart.text && !typedPart.thought) {
                  if (!finalText) {
                    sendStage("responding", "Generating response...");
                  }
                  finalText += typedPart.text;
                  sendEvent("text", typedPart.text);
                }
                // 3. FUNCTION CALL: Model decided to use a tool
                else if (typedPart.functionCall) {
                  // Store FULL part object (critical for thoughtSignature!)
                  pendingFunctionCallParts.push(part);

                  // Send descriptive stage based on tool
                  if (typedPart.functionCall.name === "searchCases") {
                    const query = (typedPart.functionCall.args as { query?: string })?.query || "";
                    sendStage("searching", `Searching: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"`);
                  } else if (typedPart.functionCall.name === "getCaseDetails") {
                    const citation = (typedPart.functionCall.args as { citation?: string })?.citation || "";
                    sendStage("retrieving", `Retrieving: ${citation}`);
                  }

                  sendEvent("tool_call", {
                    name: typedPart.functionCall.name,
                    args: typedPart.functionCall.args,
                    iteration: iteration + 1,
                  });
                }
              }
            }
          };

          // Process initial response
          await processStream(response as AsyncIterable<unknown>);

          // THE MAGIC LOOP: Keep going while model wants to use tools
          while (
            pendingFunctionCallParts.length > 0 &&
            iteration < maxIterations
          ) {
            iteration++;

            sendStage("executing", `Processing (round ${iteration} of ${maxIterations})...`);
            sendEvent("thinking", {
              type: "iteration",
              content: `Executing tool calls (iteration ${iteration}/${maxIterations})...`,
              iteration,
            });

            // Add model's response to conversation history (preserves thought signatures!)
            conversationContents.push({
              role: "model",
              parts: modelParts,
            });

            // Execute each tool the model requested
            const functionResponseParts: Array<{
              functionResponse: {
                name: string;
                response: { result: string };
              };
            }> = [];

            for (const fullPart of pendingFunctionCallParts) {
              const call = (
                fullPart as {
                  functionCall: {
                    name: string;
                    args: Record<string, unknown>;
                  };
                }
              ).functionCall;

              try {
                const { result, summary } = await executeTool(
                  call.name,
                  call.args || {}
                );

                sendEvent("tool_result", {
                  name: call.name,
                  summary,
                  iteration,
                });

                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: { result },
                  },
                });
              } catch (error) {
                const errorMsg = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
                sendEvent("tool_result", {
                  name: call.name,
                  summary: errorMsg,
                  iteration,
                });

                functionResponseParts.push({
                  functionResponse: {
                    name: call.name,
                    response: { result: errorMsg },
                  },
                });
              }
            }

            // Add tool results to conversation
            conversationContents.push({
              role: "user",
              parts: functionResponseParts,
            });

            // Ask model what to do next (with full history including thoughts + tool results)
            sendStage("thinking", "Analyzing results...");
            sendEvent("thinking", {
              type: "reasoning",
              content: "Analyzing results and deciding next action...",
              iteration,
            });

            const nextResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: tools,
                thinkingConfig: {
                  thinkingBudget: 2048,
                  includeThoughts: true,
                },
              },
            });

            // Process next response
            await processStream(nextResponse as AsyncIterable<unknown>);

            // If model wants more tools, show status
            if (pendingFunctionCallParts.length > 0) {
              sendEvent("thinking", {
                type: "continue",
                content: `Model requesting more information (${iteration + 1}/${maxIterations} iterations)...`,
                iteration: iteration + 1,
              });
            }
          }

          // Handle max iterations reached
          if (
            iteration >= maxIterations &&
            pendingFunctionCallParts.length > 0
          ) {
            sendEvent("thinking", {
              type: "limit",
              content: `Reached maximum iterations (${maxIterations}). Generating final response...`,
              iteration: maxIterations,
            });

            // Force a final answer with no more tools
            conversationContents.push({
              role: "model",
              parts: modelParts,
            });

            conversationContents.push({
              role: "user",
              parts: [
                {
                  text: "Please provide your best answer based on the cases found so far. Do not search anymore.",
                },
              ],
            });

            const finalResponse = await ai.models.generateContentStream({
              model: "gemini-3-flash-preview",
              contents: conversationContents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                // No tools - forces model to just answer
                thinkingConfig: {
                  thinkingBudget: 1024,
                  includeThoughts: true,
                },
              },
            });

            // Process final response
            for await (const chunk of finalResponse) {
              const candidate = (
                chunk as {
                  candidates?: Array<{
                    content?: { parts?: Array<unknown> };
                  }>;
                }
              ).candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                const typedPart = part as {
                  thought?: boolean;
                  text?: string;
                };

                if (typedPart.text && !typedPart.thought) {
                  sendEvent("text", typedPart.text);
                } else if (typedPart.thought && typedPart.text) {
                  sendEvent("thinking", {
                    type: "thought",
                    content: typedPart.text,
                    iteration: maxIterations,
                  });
                }
              }
            }
          }

          sendEvent("done", { iterations: iteration });
        } catch (error) {
          console.error("Stream error:", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
