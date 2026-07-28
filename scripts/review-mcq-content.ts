/**
 * Reviews an MCQ content file without modifying it.
 *
 * Supported inputs: .csv, .xlsx, .xls
 *
 * Usage:
 *   pnpm content:review -- files/mcq_fixed.csv
 *   pnpm exec tsx scripts/review-mcq-content.ts path/to/file.xlsx
 */
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import * as XLSX from "xlsx";

type CellValue = string | number | boolean | Date | null | undefined;
type ContentRow = Record<string, CellValue>;

type IssueCode =
  | "object_object"
  | "options_json"
  | "options_schema"
  | "correct_answer_count"
  | "metadata_json"
  | "metadata_schema";

interface ReviewIssue {
  code: IssueCode;
  row: number;
  id: string;
  column: string;
  message: string;
  value: string;
}

interface ReviewStats {
  rows: number;
  cells: number;
  objectObject: number;
  optionsJson: number;
  optionsSchema: number;
  correctAnswerCount: number;
  metadataJson: number;
  metadataSchema: number;
}

interface LoadedRows {
  headers: string[];
  rows: AsyncIterable<{ row: ContentRow; sourceRow: number }>;
}

const MAX_ISSUES_PER_CHECK = 10;
const REQUIRED_COLUMNS = ["options"] as const;
const METADATA_COLUMNS = ["generation_metadata", "generated_metadata"] as const;

function preview(value: unknown): string {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(
  value: CellValue,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "NULL") {
    return { ok: false, error: "value is blank or NULL" };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "unknown JSON parsing error",
    };
  }
}

function validateOptions(
  rawValue: CellValue,
):
  | { ok: true; correctAnswers: number }
  | { ok: false; code: "options_json" | "options_schema"; message: string } {
  const parsed = parseJson(rawValue);
  if (parsed.ok === false) {
    return { ok: false, code: "options_json", message: parsed.error };
  }
  if (!Array.isArray(parsed.value) || parsed.value.length < 2) {
    return {
      ok: false,
      code: "options_schema",
      message: "expected an array containing at least two option objects",
    };
  }

  let correctAnswers = 0;
  for (let index = 0; index < parsed.value.length; index++) {
    const option = parsed.value[index];
    if (!isPlainObject(option)) {
      return {
        ok: false,
        code: "options_schema",
        message: `option ${index + 1} must be an object`,
      };
    }
    if (typeof option.text !== "string" || option.text.trim() === "") {
      return {
        ok: false,
        code: "options_schema",
        message: `option ${index + 1}.text must be a non-empty string`,
      };
    }
    if (typeof option.correct !== "boolean") {
      return {
        ok: false,
        code: "options_schema",
        message: `option ${index + 1}.correct must be a boolean`,
      };
    }
    if (option.correct) correctAnswers++;
  }

  return { ok: true, correctAnswers };
}

function validateMetadata(
  rawValue: CellValue,
):
  | { ok: true }
  | { ok: false; code: "metadata_json" | "metadata_schema"; message: string } {
  const parsed = parseJson(rawValue);
  if (parsed.ok === false) {
    return { ok: false, code: "metadata_json", message: parsed.error };
  }
  if (!isPlainObject(parsed.value)) {
    return {
      ok: false,
      code: "metadata_schema",
      message: "expected a JSON object, not an array or primitive value",
    };
  }
  return { ok: true };
}

async function loadCsv(filePath: string): Promise<LoadedRows> {
  let headers: string[] = [];
  const parser = createReadStream(filePath).pipe(
    parse({
      bom: true,
      columns: (columns: string[]) => {
        headers = columns.map((column) => column.trim());
        return headers;
      },
      skip_empty_lines: true,
      relax_column_count: false,
      trim: false,
    }),
  );

  async function* rows(): AsyncGenerator<{
    row: ContentRow;
    sourceRow: number;
  }> {
    let sourceRow = 2;
    for await (const record of parser) {
      yield { row: record as ContentRow, sourceRow };
      sourceRow++;
    }
  }

  // csv-parse resolves the header lazily, so expose it after the first iterator read.
  const iterator = rows()[Symbol.asyncIterator]();
  const first = await iterator.next();
  async function* rowsWithFirst(): AsyncGenerator<{
    row: ContentRow;
    sourceRow: number;
  }> {
    if (!first.done) yield first.value;
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      yield next.value;
    }
  }

  return { headers, rows: rowsWithFirst() };
}

async function loadExcel(filePath: string): Promise<LoadedRows> {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no worksheets.");

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  if (matrix.length === 0)
    throw new Error(`Worksheet "${sheetName}" is empty.`);

  const headers = matrix[0].map((cell) => String(cell ?? "").trim());
  async function* rows(): AsyncGenerator<{
    row: ContentRow;
    sourceRow: number;
  }> {
    for (let index = 1; index < matrix.length; index++) {
      const values = matrix[index];
      const row: ContentRow = {};
      for (let column = 0; column < headers.length; column++) {
        row[headers[column]] = values[column] ?? "";
      }
      yield { row, sourceRow: index + 1 };
    }
  }

  return { headers, rows: rows() };
}

async function loadFile(filePath: string): Promise<LoadedRows> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".csv") return loadCsv(filePath);
  if (extension === ".xlsx" || extension === ".xls") return loadExcel(filePath);
  throw new Error(
    `Unsupported file type "${extension}". Use .csv, .xlsx, or .xls.`,
  );
}

function addIssue(
  issues: ReviewIssue[],
  counts: Map<IssueCode, number>,
  issue: ReviewIssue,
): void {
  const count = (counts.get(issue.code) ?? 0) + 1;
  counts.set(issue.code, count);
  if (count <= MAX_ISSUES_PER_CHECK) issues.push(issue);
}

function ensureColumns(headers: string[]): string {
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  const metadataColumn = METADATA_COLUMNS.find((column) =>
    headers.includes(column),
  );
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}`);
  }
  if (!metadataColumn) {
    throw new Error(
      `Missing metadata column. Expected one of: ${METADATA_COLUMNS.join(", ")}`,
    );
  }
  return metadataColumn;
}

async function review(filePath: string): Promise<void> {
  const loaded = await loadFile(filePath);
  const metadataColumn = ensureColumns(loaded.headers);
  const issues: ReviewIssue[] = [];
  const counts = new Map<IssueCode, number>();
  let rows = 0;
  let cells = 0;

  for await (const { row, sourceRow } of loaded.rows) {
    rows++;

    for (const header of loaded.headers) {
      cells++;
      const value = row[header];
      if (
        String(value ?? "")
          .toLowerCase()
          .includes("[object object]")
      ) {
        addIssue(issues, counts, {
          code: "object_object",
          row: sourceRow,
          id: preview(row.id),
          column: header,
          message: 'contains the invalid text "[object Object]"',
          value: preview(value),
        });
      }
    }

    const options = validateOptions(row.options);
    if (options.ok === false) {
      addIssue(issues, counts, {
        code: options.code,
        row: sourceRow,
        id: preview(row.id),
        column: "options",
        message: options.message,
        value: preview(row.options),
      });
    } else if (options.correctAnswers !== 1) {
      addIssue(issues, counts, {
        code: "correct_answer_count",
        row: sourceRow,
        id: preview(row.id),
        column: "options",
        message: `expected exactly 1 correct option, found ${options.correctAnswers}`,
        value: preview(row.options),
      });
    }

    const metadata = validateMetadata(row[metadataColumn]);
    if (metadata.ok === false) {
      addIssue(issues, counts, {
        code: metadata.code,
        row: sourceRow,
        id: preview(row.id),
        column: metadataColumn,
        message: metadata.message,
        value: preview(row[metadataColumn]),
      });
    }
  }

  if (rows === 0) throw new Error("The file has headers but no content rows.");

  const stats: ReviewStats = {
    rows,
    cells,
    objectObject: counts.get("object_object") ?? 0,
    optionsJson: counts.get("options_json") ?? 0,
    optionsSchema: counts.get("options_schema") ?? 0,
    correctAnswerCount: counts.get("correct_answer_count") ?? 0,
    metadataJson: counts.get("metadata_json") ?? 0,
    metadataSchema: counts.get("metadata_schema") ?? 0,
  };
  const totalIssues = [...counts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );

  console.log(`\nContent review: ${filePath}`);
  console.log(`Metadata column: ${metadataColumn}`);
  console.table([
    { check: "Rows reviewed", failures: 0, reviewed: stats.rows },
    {
      check: "Cells containing [object Object]",
      failures: stats.objectObject,
      reviewed: stats.cells,
    },
    {
      check: "Options JSON parse",
      failures: stats.optionsJson,
      reviewed: stats.rows,
    },
    {
      check: "Options schema ({ text: string, correct: boolean }[])",
      failures: stats.optionsSchema,
      reviewed: stats.rows,
    },
    {
      check: "Exactly one correct option",
      failures: stats.correctAnswerCount,
      reviewed: stats.rows,
    },
    {
      check: "Metadata JSON parse",
      failures: stats.metadataJson,
      reviewed: stats.rows,
    },
    {
      check: "Metadata schema (JSON object)",
      failures: stats.metadataSchema,
      reviewed: stats.rows,
    },
  ]);

  if (issues.length > 0) {
    console.log(
      `\nIssue samples (up to ${MAX_ISSUES_PER_CHECK} per failed check; ${totalIssues} total):`,
    );
    console.table(issues);
  }

  if (totalIssues > 0) {
    console.error(`\nFAIL: found ${totalIssues} validation issue(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: all requested checks passed.");
}

async function main(): Promise<void> {
  const input = process.argv.slice(2).find((argument) => argument !== "--");
  if (!input) {
    throw new Error(
      "Missing file path.\nUsage: pnpm content:review -- files/mcq_fixed.csv",
    );
  }

  const filePath = path.resolve(process.cwd(), input);
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  await review(filePath);
}

main().catch((error: unknown) => {
  console.error(
    `\nERROR: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
