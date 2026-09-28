import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bothNumeric,
  deterministicMatch,
  legacyMatch,
  normalizeAnswer,
} from "@/lib/fitb/normalize";

function matches(student: string, reference: string) {
  return deterministicMatch(
    normalizeAnswer(student),
    normalizeAnswer(reference),
  );
}

describe("FITB tier 1 — formatting is forgiven", () => {
  const shouldMatch: Array<[string, string, string]> = [
    ["5", "5", "identical"],
    [" 5 ", "5", "surrounding space"],
    ["Triangle", "triangle", "capitalisation"],
    ["triangle.", "triangle", "trailing full stop"],
    ["5cm", "5 cm", "missing space before unit"],
    ["5 cm", "5cm", "extra space before unit"],
    ["$5", "5", "currency the prompt already carries"],
    ["5", "$5", "currency omitted"],
    [".5", "0.5", "bare leading decimal point"],
    ["0.50", "0.5", "trailing zero"],
    ["2,000", "2000", "thousands separator"],
    ["1/2", "½", "vulgar fraction glyph"],
    ["0.25", "1/4", "decimal for a fraction"],
    ["1 1/2", "1.5", "mixed number"],
    ["-3", "−3", "unicode minus sign"],
    ["one half", "1/2", "word form of a simple fraction"],
    ["a quarter", "0.25", "article plus word fraction"],
    ["seven", "7", "number word"],
    ["50%", "50 %", "percent spacing"],
    ["5", "5 cm", "unit left off a numeric answer"],
    ["5 cm", "5 cm", "non-breaking space from a paste"],
  ];

  for (const [student, reference, why] of shouldMatch) {
    it(`accepts "${student}" for "${reference}" — ${why}`, () => {
      assert.equal(matches(student, reference).match, true);
    });
  }
});

describe("FITB tier 1 — real differences still fail", () => {
  const shouldNotMatch: Array<[string, string, string]> = [
    ["5", "6", "different number"],
    ["1/4", "1/2", "different fraction"],
    ["5 cm", "5 m", "different unit, same number"],
    ["5 m", "5 cm", "different unit the other way"],
    ["square", "rectangle", "different word"],
    ["", "5", "nothing typed"],
    ["   ", "5", "whitespace only"],
    ["3:4", "0.75", "a ratio is not its decimal"],
    ["0.75", "3:4", "and not the reverse"],
  ];

  for (const [student, reference, why] of shouldNotMatch) {
    it(`rejects "${student}" for "${reference}" — ${why}`, () => {
      assert.equal(matches(student, reference).match, false);
    });
  }
});

describe("FITB tier 1 — what it refuses to decide", () => {
  it("does not match a synonym, leaving it for the semantic tier", () => {
    assert.equal(matches("one fourth of it", "1/4").match, false);
  });

  it("does not match a reworded explanation", () => {
    assert.equal(
      matches("all the sides are the same length", "all four sides are equal")
        .match,
      false,
    );
  });

  it("flags two numbers as settled so no model call is wasted", () => {
    assert.equal(bothNumeric(normalizeAnswer("6"), normalizeAnswer("5")), true);
    assert.equal(
      bothNumeric(normalizeAnswer("square"), normalizeAnswer("rectangle")),
      false,
    );
  });

  it("keeps a bare unit word as an answer, not as a unit", () => {
    const parsed = normalizeAnswer("metres");
    assert.equal(parsed.unit, null);
    assert.equal(parsed.strict, "metres");
  });

  it("does not mistake a plural noun for a seconds unit", () => {
    assert.equal(normalizeAnswer("apples").unit, null);
  });
});

describe("the grader this replaces", () => {
  it("rejects every formatting variant that tier 1 accepts", () => {
    const variants = ["5cm", "$5", ".5", "0.50", "2,000", "1/2", "Triangle."];
    const keys = ["5 cm", "5", "0.5", "0.5", "2000", "½", "triangle"];
    variants.forEach((variant, i) => {
      assert.equal(
        legacyMatch(variant, keys[i]),
        false,
        `today's grader unexpectedly accepted ${variant}`,
      );
      assert.equal(
        matches(variant, keys[i]).match,
        true,
        `tier 1 should accept ${variant}`,
      );
    });
  });

  it("still agrees on a plain case difference", () => {
    assert.equal(legacyMatch("Triangle", "triangle"), true);
  });
});
