// ─────────────────────────────────────────────────────────────────────────────
// Provider switch for structured generation.
//
// ISOPENAI=true  → use OpenAI gpt-5.6-luna (responses.parse + zodTextFormat), the old path.
// otherwise      → use Claude Sonnet 4.6 on Bedrock (forced tool use).
//
// Both providers are driven from the same prompts; each route passes a Zod schema
// (for OpenAI) and an equivalent JSON Schema + tool name (for Bedrock).
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { bedrockStructured, BEDROCK_MODEL_ID } from "./bedrock";

export const USE_OPENAI = process.env.ISOPENAI === "true";

const OPENAI_MODEL = "gpt-5.6-luna";

/** Human-readable label of the active model, for logs. */
export function activeModelLabel(): string {
  return USE_OPENAI ? `${OPENAI_MODEL} (OpenAI)` : `${BEDROCK_MODEL_ID} (Bedrock)`;
}

/** True if the env var required by the active provider is set. */
export function providerKeyConfigured(): boolean {
  return USE_OPENAI ? !!process.env.OPENAI_API_KEY : !!process.env.AWS_BEARER_TOKEN_BEDROCK;
}

export function providerKeyName(): string {
  return USE_OPENAI ? "OPENAI_API_KEY" : "AWS_BEARER_TOKEN_BEDROCK";
}

export async function llmStructured<T = any>(opts: {
  system: string;
  user: string;
  zodSchema: ZodType<T>;
  schemaName: string;
  jsonSchema: Record<string, any>;
  toolName: string;
  toolDescription?: string;
  maxTokens?: number;
  /**
   * Optional large static prefix to prompt-cache. On Bedrock it becomes a
   * cache_control system block; on OpenAI it's simply prepended to `system`
   * (OpenAI auto-caches stable prefixes). Keep it byte-identical across calls.
   */
  systemCachePrefix?: string;
}): Promise<{ data: T; usage: any; provider: "openai" | "bedrock" }> {
  if (USE_OPENAI) {
    const openai = new OpenAI({ timeout: 150_000, maxRetries: 1 });
    // Prefix first so OpenAI's automatic prefix caching can reuse it.
    const system = opts.systemCachePrefix
      ? `${opts.systemCachePrefix}\n${opts.system}`
      : opts.system;
    const response = await openai.responses.parse({
      model: OPENAI_MODEL,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: system },
        { role: "user", content: opts.user },
      ],
      text: {
        verbosity: "low",
        format: zodTextFormat(opts.zodSchema as any, opts.schemaName),
      },
    });
    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error("OpenAI returned no parsed output");
    }
    return { data: parsed as T, usage: response.usage, provider: "openai" };
  }

  const { data, usage } = await bedrockStructured<T>({
    system: opts.system,
    user: opts.user,
    schema: opts.jsonSchema,
    toolName: opts.toolName,
    toolDescription: opts.toolDescription,
    maxTokens: opts.maxTokens,
    systemCachePrefix: opts.systemCachePrefix,
  });
  return { data, usage, provider: "bedrock" };
}
