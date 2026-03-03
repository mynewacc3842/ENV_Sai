/**
 * AI Provider Abstraction Layer
 *
 * Supports OpenAI-compatible APIs. Easily extensible to other providers.
 * All AI interactions go through this service.
 */

import OpenAI from "openai";
import { env } from "@/lib/config/env";
import { aiOutputSchema, type AiOutput } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

// ─── Provider Interface ───

export interface AiProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiSuggestionRequest {
  manifestJson: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiSuggestionResult {
  output: AiOutput;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── System Prompt ───

const SYSTEM_PROMPT = `You are an expert Roblox Studio development AI agent.

You MUST respond ONLY with valid JSON conforming to this exact schema:
{
  "patch": {
    "ops": [
      {
        "op": "create" | "update" | "delete",
        "path": "<instance path in workspace tree, e.g. game.Workspace.MyModel>",
        "className": "<Roblox class name, only for create>",
        "properties": { "<property>": "<value>" },
        "source": "<Luau source code, only for Script/LocalScript/ModuleScript>"
      }
    ]
  },
  "summary": "<brief human-readable explanation of what the patch does>"
}

RULES:
1. Generate ONLY Luau code (not Lua 5.1 or JavaScript).
2. All source code must be valid Luau for Roblox.
3. Use proper Roblox API calls (game:GetService, Instance.new, etc.).
4. The "path" field uses dot notation from game root (e.g., "game.ServerScriptService.MainScript").
5. For "create" ops, include "className" (e.g., "Script", "Part", "ModuleScript").
6. For "update" ops, include only changed properties or source.
7. For "delete" ops, include only the "path".
8. Do NOT include explanations outside the JSON.
9. Do NOT wrap in markdown code blocks.
10. Output MUST be parseable JSON.`;

// ─── OpenAI-Compatible Provider ───

export class AiService {
  private client: OpenAI;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config?: Partial<AiProviderConfig>) {
    this.client = new OpenAI({
      apiKey: config?.apiKey || env.openaiApiKey,
      baseURL: config?.baseUrl || env.openaiBaseUrl,
    });
    this.model = config?.model || env.openaiModel;
    this.defaultMaxTokens = config?.maxTokens || 4096;
    this.defaultTemperature = config?.temperature || 0.2;
  }

  async generateSuggestion(
    request: AiSuggestionRequest
  ): Promise<AiSuggestionResult> {
    const startTime = Date.now();

    logger.info("AI suggestion request starting", {
      promptLength: request.prompt.length,
      manifestLength: request.manifestJson.length,
      model: this.model,
    });

    const userMessage = `WORKSPACE MANIFEST:
\`\`\`json
${request.manifestJson}
\`\`\`

USER REQUEST:
${request.prompt}`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: request.maxTokens || this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new AiServiceError("AI returned empty response");
    }

    // Parse and validate
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error("AI returned invalid JSON", { rawContent: rawContent.slice(0, 500) });
      throw new AiServiceError("AI returned invalid JSON");
    }

    const validated = aiOutputSchema.safeParse(parsed);
    if (!validated.success) {
      logger.error("AI output failed schema validation", {
        errors: validated.error.flatten(),
        rawContent: rawContent.slice(0, 500),
      });
      throw new AiServiceError(
        "AI output does not match expected schema",
        validated.error.flatten()
      );
    }

    const duration = Date.now() - startTime;
    logger.info("AI suggestion completed", {
      duration,
      opsCount: validated.data.patch.ops.length,
      model: this.model,
      tokens: completion.usage?.total_tokens,
    });

    return {
      output: validated.data,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Stream a suggestion (for SSE endpoints).
   * Returns an async generator of partial content.
   */
  async *streamSuggestion(
    request: AiSuggestionRequest
  ): AsyncGenerator<string, void, unknown> {
    const userMessage = `WORKSPACE MANIFEST:
\`\`\`json
${request.manifestJson}
\`\`\`

USER REQUEST:
${request.prompt}`;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: request.maxTokens || this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

// ─── Error Class ───

export class AiServiceError extends Error {
  public details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "AiServiceError";
    this.details = details;
  }
}

// ─── Singleton ───

let aiServiceInstance: AiService | undefined;

export function getAiService(): AiService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AiService();
  }
  return aiServiceInstance;
}
