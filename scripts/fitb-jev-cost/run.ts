// Measures what a FITB Jev call really costs, using the exact request the
// prototype sends (lib/fitb/jev.ts) and the token counts TypeSafe reports back.
//
//   node --require ./scripts/fitb-jev-cost/server-only-stub.cjs --import tsx \
//     --env-file=.env.local scripts/fitb-jev-cost/run.ts [samples=12] [attempts=100000]
//
// Samples are spread across question length (shortest → longest), then input
// tokens are fitted against state size and projected over the whole bank.

import { loadFitbBank, type FitbRow } from "../../lib/fitb/csv-source";
import { judgeEquivalence } from "../../lib/fitb/jev";

const PRICE_PER_M_INPUT = 0.042; // USD, output tokens are free
const SAMPLES = Number(process.argv[2] ?? 12);
const ATTEMPTS = Number(process.argv[3] ?? 100_000);

/** A reworded answer, so Jev has a real equivalence judgment to make. */
function reworded(row: FitbRow): string {
  return `it is ${row.answer}`;
}

function stateChars(row: FitbRow, studentAnswer: string): number {
  return (
    row.question.length +
    row.answer.length +
    studentAnswer.length +
    row.subject.length +
    row.grade.length +
    row.topic.length
  );
}

function pick(rows: FitbRow[], n: number): FitbRow[] {
  const sorted = [...rows].sort((a, b) => a.question.length - b.question.length);
  if (sorted.length <= n) return sorted;
  return Array.from(
    { length: n },
    (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (n - 1))],
  );
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;

async function main() {
  const bank = loadFitbBank();
  const rows = bank.rows.filter((r) => r.answer.trim() !== "");
  const sample = pick(rows, SAMPLES);
  console.log(`Bank: ${rows.length} gradable blanks. Calling Jev ${sample.length} times…\n`);

  const measured: Array<{ chars: number; tokens: number; latencyMs: number }> = [];
  for (const row of sample) {
    const studentAnswer = reworded(row);
    try {
      const res = await judgeEquivalence({
        question: row.question,
        referenceAnswer: row.answer,
        studentAnswer,
        subject: row.subject,
        grade: row.grade,
        topic: row.topic,
      });
      const tokens = res.usage?.input_tokens;
      const chars = stateChars(row, studentAnswer);
      console.log(
        `${row.id.padEnd(12)} q=${String(row.question.length).padStart(4)} chars  ` +
          `in=${String(tokens ?? "?").padStart(5)} out=${String(res.usage?.output_tokens ?? "?").padStart(3)}  ` +
          `${String(res.latencyMs).padStart(5)}ms  equiv=${res.equivalent.toFixed(2)}`,
      );
      if (typeof tokens === "number") {
        measured.push({ chars, tokens, latencyMs: res.latencyMs });
      }
    } catch (error) {
      console.log(`${row.id.padEnd(12)} failed: ${(error as Error).message}`);
    }
  }

  if (measured.length === 0) {
    console.log("\nNo usage figures came back, so nothing to project.");
    return;
  }

  // Least-squares fit: tokens ≈ base + perChar × stateChars.
  const n = measured.length;
  const mx = measured.reduce((s, m) => s + m.chars, 0) / n;
  const my = measured.reduce((s, m) => s + m.tokens, 0) / n;
  const sxx = measured.reduce((s, m) => s + (m.chars - mx) ** 2, 0);
  const perChar =
    sxx === 0 ? 0 : measured.reduce((s, m) => s + (m.chars - mx) * (m.tokens - my), 0) / sxx;
  const base = my - perChar * mx;

  const bankChars = rows.map((r) => stateChars(r, reworded(r)));
  const bankMeanChars = bankChars.reduce((s, c) => s + c, 0) / bankChars.length;
  const projected = base + perChar * bankMeanChars;
  const tokens = measured.map((m) => m.tokens);
  const latency = measured.map((m) => m.latencyMs);

  console.log(`
Measured input tokens per call
  min ${Math.min(...tokens)}  mean ${Math.round(my)}  p95 ${percentile(tokens, 0.95)}  max ${Math.max(...tokens)}
  fit: ${base.toFixed(0)} fixed + ${perChar.toFixed(3)} per state char
  projected bank mean: ${projected.toFixed(0)} tokens/call
Latency  p50 ${percentile(latency, 0.5)}ms  p95 ${percentile(latency, 0.95)}ms

Cost for ${ATTEMPTS.toLocaleString("en-US")} attempts at $${PRICE_PER_M_INPUT}/M input tokens`);

  for (const share of [1, 0.5, 0.3, 0.1]) {
    const calls = ATTEMPTS * share;
    const cost = (calls * projected * PRICE_PER_M_INPUT) / 1_000_000;
    console.log(
      `  ${String(Math.round(share * 100)).padStart(3)}% reach Jev  ${calls.toLocaleString("en-US").padStart(7)} calls  ${usd(cost)}`,
    );
  }
  console.log(`  cost per call: $${((projected * PRICE_PER_M_INPUT) / 1_000_000).toFixed(7)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
