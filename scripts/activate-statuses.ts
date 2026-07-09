/**
 * activate-statuses.ts
 * --------------------
 * In-place edit of an exported interactive-questions .xlsx: sets every row's
 *   - source_variation_status -> "active"
 *   - source_verifier_status  -> "active"
 *   - template_status         -> "active"
 *
 * Nothing else changes. All other columns and rows are preserved verbatim, and
 * the SAME file is overwritten (no new file). No DB access — pure spreadsheet
 * transform.
 *
 * Usage:
 *   npx tsx scripts/activate-statuses.ts "new export/interactive_questions_grade_KG_lo_corrected.xlsx"
 */
import path from "node:path";
import * as XLSX from "xlsx";

const TARGET_COLUMNS = [
  "source_variation_status",
  "source_verifier_status",
  "template_status",
];
const NEW_VALUE = "active";

function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error(
      'Usage: npx tsx scripts/activate-statuses.ts "<path-to.xlsx>"',
    );
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), inPath);

  // Read as a raw 2D array so no structure/columns are altered.
  const wb = XLSX.readFile(abs);
  const sheetName = wb.SheetNames[0];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    blankrows: false,
  });
  if (aoa.length === 0) throw new Error("Empty sheet.");

  const header = (aoa[0] as unknown[]).map((h) => String(h));
  const cols = TARGET_COLUMNS.map((name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Column "${name}" not found in sheet header.`);
    return { name, i };
  });

  // Track the values we're replacing so the run is auditable.
  const before = new Map<string, Map<string, number>>(
    cols.map((c) => [c.name, new Map<string, number>()]),
  );

  let rows = 0;
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    if (!row || row.length === 0) continue;
    rows++;
    for (const c of cols) {
      const prev = String(row[c.i] ?? "").trim() || "(blank)";
      const counts = before.get(c.name)!;
      counts.set(prev, (counts.get(prev) ?? 0) + 1);
      row[c.i] = NEW_VALUE;
    }
  }

  // Rebuild the sheet from the same 2D array and overwrite in place.
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(outWb, abs);

  console.log(
    `✓ Set ${TARGET_COLUMNS.join(" + ")} = "${NEW_VALUE}" on ${rows} rows -> ${abs}`,
  );
  for (const c of cols) {
    const summary = [...before.get(c.name)!.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, n]) => `${v}=${n}`)
      .join(", ");
    console.log(`  ${c.name} previous values: ${summary}`);
  }
}

main();
