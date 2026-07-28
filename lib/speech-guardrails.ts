import OpenAI from "openai";

const MAX_TRANSCRIPT_LENGTH = 500;
const SQL_INJECTION_PATTERN =
  /('|--|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bUNION\b|\bALTER\b|\bEXEC\b|\bEXECUTE\b|\bOR\b.*=.*--)/i;
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const openai = new OpenAI();

export function sanitizeTranscript(raw: string): string {
  let cleaned = raw.slice(0, MAX_TRANSCRIPT_LENGTH);
  cleaned = cleaned.replace(CONTROL_CHAR_PATTERN, "");
  cleaned = cleaned.normalize("NFC");
  return cleaned.trim();
}

export function hasSqlInjectionRisk(text: string): boolean {
  return SQL_INJECTION_PATTERN.test(text);
}

export function hasHarmfulContent(text: string): boolean {
  const harmful =
    /(\bgiveaway\b|\bfree\s+\w+\s+\bclick\b|\bbuy\s+now\b)/i;
  return harmful.test(text);
}

export async function moderateTranscript(
  text: string,
): Promise<{ approved: boolean; flagged: boolean; categories: string[] }> {
  const sanitized = sanitizeTranscript(text);
  if (sanitized.length === 0) return { approved: false, flagged: false, categories: [] };

  if (hasSqlInjectionRisk(sanitized)) {
    return { approved: false, flagged: true, categories: ["sql_injection"] };
  }

  try {
    const moderation = await openai.moderations.create({ input: sanitized });
    const result = moderation.results[0];
    if (!result) return { approved: true, flagged: false, categories: [] };

    const flaggedCategories = Object.entries(result.categories)
      .filter(([, val]) => val)
      .map(([key]) => key);

    return {
      approved: !result.flagged,
      flagged: result.flagged,
      categories: flaggedCategories,
    };
  } catch {
    return { approved: true, flagged: false, categories: [] };
  }
}
