// ─────────────────────────────────────────────────────────────────────────────
// Structured generation using OpenAI.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";

export const USE_OPENAI = true;

const OPENAI_MODEL = "gpt-5.6-luna";

/** Human-readable label of the active model, for logs. */
export function activeModelLabel(): string {
  return `${OPENAI_MODEL} (OpenAI)`;
}

/** True if the env var required by the active provider is set. */
export function providerKeyConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function providerKeyName(): string {
  return "OPENAI_API_KEY";
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
  systemCachePrefix?: string;
}): Promise<{ data: T; usage: any; provider: "openai" | "bedrock" }> {
  const openai = new OpenAI({ timeout: 150_000, maxRetries: 1 });
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
