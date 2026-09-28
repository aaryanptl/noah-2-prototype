/**
 * Formatting variants of an answer key — the shapes students actually type that
 * today's exact-match grader rejects. Purely mechanical: these all demonstrate
 * tier 1, and none of them needs a model. Wording variants ("one fourth",
 * "because all the sides are equal") are typed by hand on the bench, because
 * inventing those client-side is the job the semantic tier exists to do.
 */

const FRACTION_TO_WORDS: Record<string, string> = {
  "1/2": "one half",
  "1/3": "one third",
  "1/4": "one quarter",
  "2/3": "two thirds",
  "3/4": "three quarters",
};

const UNIT_PATTERN =
  /^(-?[\d.,/ ]+?)\s*(cm|mm|km|m|kg|g|ml|l|%|minutes|minute|min|seconds|second|s|hours|hour|hr)$/i;

export function formattingVariants(key: string): string[] {
  const trimmed = key.trim();
  if (!trimmed) return [];

  const out = new Set<string>();
  const add = (v: string) => {
    const value = v.trim();
    if (value && value !== trimmed) out.add(value);
  };

  // Case and stray punctuation
  add(trimmed.toUpperCase());
  add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
  add(`${trimmed}.`);
  add(` ${trimmed} `);

  // Unit spacing and omission
  const withUnit = trimmed.match(UNIT_PATTERN);
  if (withUnit) {
    const [, value, unit] = withUnit;
    add(`${value.trim()}${unit}`);
    add(`${value.trim()} ${unit}`);
    add(value.trim());
  }

  const numeric = Number(trimmed.replace(/[$£€₹,]/g, ""));
  if (Number.isFinite(numeric) && trimmed !== "") {
    add(`$${trimmed}`);
    add(numeric.toLocaleString("en-US"));
    if (Number.isInteger(numeric)) {
      add(`${numeric}.0`);
      add(`${numeric}.00`);
    }
    if (!Number.isInteger(numeric) && Math.abs(numeric) < 1) {
      add(String(numeric).replace(/^(-?)0\./, "$1."));
    }
  }

  // Fractions both ways
  const frac = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const value = Number(frac[1]) / Number(frac[2]);
    add(String(Number(value.toFixed(6))));
    add(`${frac[1]} / ${frac[2]}`);
    const words = FRACTION_TO_WORDS[`${frac[1]}/${frac[2]}`];
    if (words) add(words);
  }
  const decimal = Number(trimmed);
  if (Number.isFinite(decimal) && !Number.isInteger(decimal)) {
    for (const [f, words] of Object.entries(FRACTION_TO_WORDS)) {
      const [n, d] = f.split("/").map(Number);
      if (Math.abs(n / d - decimal) < 1e-9) {
        add(f);
        add(words);
      }
    }
  }

  // Articles and lead-ins a child adds to a word answer
  if (/^[a-z][a-z\s'-]*$/i.test(trimmed) && !/^(a|an|the)\s/i.test(trimmed)) {
    add(`a ${trimmed}`);
    add(`the ${trimmed}`);
  }

  return [...out].slice(0, 10);
}
