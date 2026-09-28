// ─────────────────────────────────────────────────────────────────────────────
// FITB tier 1 — deterministic normalization.
//
// Everything here is pure, instant and free. It exists to absorb the *formatting*
// class of false negatives (symbols, units, currency, fraction glyphs, spacing)
// so the semantic tier is only ever asked about genuine wording differences.
//
// The unit of comparison is a set of "keys": each answer yields several canonical
// forms, and two answers match when any key is shared. That is easier to extend
// than a single canonical string, because a loose form can be added without
// weakening the strict one.
// ─────────────────────────────────────────────────────────────────────────────

const VULGAR_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

// Currency marks are stripped before numeric parsing. The prompt carries the
// currency in practice ("Ravi has $___"), so "$5" and "5" are the same answer.
const CURRENCY = /[$£€₹¥]/g;

// Units we recognise well enough to compare. Anything else stays in the text
// form, where it still has to match literally.
const UNIT_ALIASES: Record<string, string> = {
  cm: "cm",
  centimetre: "cm",
  centimetres: "cm",
  centimeter: "cm",
  centimeters: "cm",
  m: "m",
  metre: "m",
  metres: "m",
  meter: "m",
  meters: "m",
  mm: "mm",
  millimetre: "mm",
  millimetres: "mm",
  millimeter: "mm",
  millimeters: "mm",
  km: "km",
  kilometre: "km",
  kilometres: "km",
  kilometer: "km",
  kilometers: "km",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  l: "l",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  ml: "ml",
  millilitre: "ml",
  millilitres: "ml",
  milliliter: "ml",
  milliliters: "ml",
  sec: "s",
  secs: "s",
  second: "s",
  seconds: "s",
  min: "min",
  mins: "min",
  minute: "min",
  minutes: "min",
  hr: "hr",
  hrs: "hr",
  hour: "hr",
  hours: "hr",
  cm2: "cm2",
  "sq cm": "cm2",
  m2: "m2",
  "sq m": "m2",
  cm3: "cm3",
  "%": "%",
  degree: "deg",
  degrees: "deg",
  "°": "deg",
};

// Number words a primary student may write instead of a digit.
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

// Word forms of simple fractions — the single most common "similar words"
// complaint on maths blanks.
const FRACTION_WORDS: Record<string, string> = {
  half: "1/2",
  "a half": "1/2",
  "one half": "1/2",
  quarter: "1/4",
  "a quarter": "1/4",
  "one quarter": "1/4",
  "one fourth": "1/4",
  "three quarters": "3/4",
  "three fourths": "3/4",
  "a third": "1/3",
  "one third": "1/3",
  "two thirds": "2/3",
};

export interface NormalizedAnswer {
  /** Exactly what the student typed. */
  raw: string;
  /** Lowercased, unicode-folded, whitespace-collapsed. */
  strict: string;
  /** strict, minus punctuation, articles and all spacing. */
  loose: string;
  /** Numeric value when the answer resolves to one, else null. */
  value: number | null;
  /** Canonical unit when one was recognised, else null. */
  unit: string | null;
  /** All forms this answer can match on. */
  keys: string[];
}

/** Unicode-fold, lowercase, unify dashes and fraction glyphs, collapse spaces. */
function fold(input: string): string {
  let s = String(input ?? "").normalize("NFKC");
  for (const [glyph, plain] of Object.entries(VULGAR_FRACTIONS)) {
    s = s.split(glyph).join(plain);
  }
  return s
    .replace(/[−–—]/g, "-") // minus sign, en dash, em dash
    .replace(/[‘’ʼ]/g, "'") // curly apostrophes
    .replace(/[“”]/g, '"')
    .replace(/⁄/g, "/") // fraction slash
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop wrapping quotes/brackets and trailing sentence punctuation. */
function stripEdges(s: string): string {
  return s
    .replace(/^["'([]+/, "")
    .replace(/["')\].,;!]+$/, "")
    .trim();
}

/** Pull a trailing unit off the text, returning the rest and the canonical unit. */
function splitUnit(s: string): { body: string; unit: string | null } {
  // Longest alias first so "sq cm" wins over "cm".
  const aliases = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const isWordy = /^[a-z]/.test(alias);
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A wordy unit must follow a digit or a space, so "apples" is not "apple"+s.
    const pattern = isWordy
      ? new RegExp(`[\\d\\s]${escaped}$`)
      : new RegExp(`${escaped}$`);
    if (pattern.test(s)) {
      const body = s.slice(0, s.length - alias.length).trim();
      // Only a unit when something precedes it — otherwise "metres" is the
      // whole answer, not a unit on an empty value.
      if (body.length > 0) return { body, unit: UNIT_ALIASES[alias] };
    }
  }
  return { body: s, unit: null };
}

/** Parse digits, decimals, fractions, mixed numbers and small number words. */
function parseValue(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(CURRENCY, "").replace(/,/g, "").trim();

  // Mixed number: "1 1/2"
  const mixed = cleaned.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const den = Number(mixed[3]);
    if (den === 0) return null;
    const mag = Math.abs(whole) + Number(mixed[2]) / den;
    return whole < 0 ? -mag : mag;
  }

  // Plain fraction: "3/4"
  const frac = cleaned.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    return den === 0 ? null : Number(frac[1]) / den;
  }

  // A ratio ("3:4") is deliberately NOT a number — 3:4 and 0.75 are different
  // answers to a ratio question.

  // Decimal / integer, bare leading dot allowed (".5")
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  if (Object.hasOwn(NUMBER_WORDS, cleaned)) return NUMBER_WORDS[cleaned];

  return null;
}

/** Build every canonical form an answer can be matched on. */
export function normalizeAnswer(input: unknown): NormalizedAnswer {
  const raw = typeof input === "string" ? input : String(input ?? "");
  const strict = stripEdges(fold(raw));

  // Word fractions resolve first, so "a quarter" becomes "1/4".
  const base = FRACTION_WORDS[strict] ?? strict;

  const { body, unit } = splitUnit(base);
  const value = parseValue(body) ?? parseValue(base);

  const loose = base
    .replace(CURRENCY, "")
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^\p{L}\p{N}/.-]/gu, "");

  const keys = new Set<string>();
  if (strict) keys.add(`t:${strict}`);
  if (base && base !== strict) keys.add(`t:${base}`);
  if (loose) keys.add(`l:${loose}`);
  if (value !== null) {
    // Round hard so float drift can never split a match.
    const canonical = Number(value.toFixed(9));
    if (unit) keys.add(`n:${canonical}:${unit}`);
    keys.add(`n:${canonical}`);
  }

  return { raw, strict, loose, value, unit, keys: [...keys] };
}

export type DeterministicBasis =
  | "exact"
  | "case-space"
  | "symbol"
  | "numeric"
  | "unit-omitted";

export interface DeterministicMatch {
  match: boolean;
  /** Which canonical form agreed — shown in the UI so a pass is explainable. */
  on: DeterministicBasis | null;
  note?: string;
}

/**
 * Compare two answers on formatting alone. Never makes a semantic judgment: if
 * the words genuinely differ this returns false and the caller escalates.
 */
export function deterministicMatch(
  student: NormalizedAnswer,
  reference: NormalizedAnswer,
): DeterministicMatch {
  if (student.raw.trim() === "") return { match: false, on: null };

  if (student.raw.trim() === reference.raw.trim()) {
    return { match: true, on: "exact" };
  }
  if (student.strict === reference.strict) {
    return { match: true, on: "case-space" };
  }

  // Units must agree when both sides declare one: 5 cm is not 5 m.
  if (
    student.unit !== null &&
    reference.unit !== null &&
    student.unit !== reference.unit
  ) {
    return {
      match: false,
      on: null,
      note: `Units differ (${student.unit} vs ${reference.unit}).`,
    };
  }

  if (student.value !== null && reference.value !== null) {
    if (Math.abs(student.value - reference.value) < 1e-9) {
      const unitOmitted = (student.unit === null) !== (reference.unit === null);
      return {
        match: true,
        on: unitOmitted ? "unit-omitted" : "numeric",
        ...(unitOmitted
          ? {
              note: `Same value; unit "${reference.unit ?? student.unit}" not written out.`,
            }
          : {}),
      };
    }
    // Both sides are numbers and they differ — no wording judgment can save this.
    return { match: false, on: null };
  }

  if (student.keys.some((k) => reference.keys.includes(k))) {
    return { match: true, on: "symbol" };
  }

  return { match: false, on: null };
}

/** True when both sides parse as numbers — the semantic tier adds nothing here. */
export function bothNumeric(
  student: NormalizedAnswer,
  reference: NormalizedAnswer,
): boolean {
  return student.value !== null && reference.value !== null;
}

/** Today's grader, reproduced exactly — see lib/prototype-homework.ts:580. */
export function legacyNorm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function legacyMatch(
  studentAnswer: unknown,
  modelAnswer: string,
  acceptableAnswers: string[] = [],
): boolean {
  const given = legacyNorm(studentAnswer);
  if (given.length === 0) return false;
  return (
    given === legacyNorm(modelAnswer) ||
    acceptableAnswers.map(legacyNorm).includes(given)
  );
}
