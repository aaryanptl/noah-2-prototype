import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { Workbook } from "file:///C:/Users/aarya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const ROOT = process.cwd();
const FILES = path.join(ROOT, "files");
const SOURCE_FILE = path.join(FILES, "drgdrop_fixed.csv");
const OLD_MANIFEST_FILE = path.join(FILES, "drgdrop_regional_split_manifest.csv");

const OUTPUTS = {
  correctedGlobal: path.join(FILES, "drgdrop_global_corrected.csv"),
  variants: path.join(FILES, "drgdrop_family_complete_variants.csv"),
  final: path.join(FILES, "drgdrop_final_family_complete.csv"),
  manifest: path.join(FILES, "drgdrop_family_complete_manifest.csv"),
  issues: path.join(FILES, "drgdrop_family_complete_issues.csv"),
};

const REGIONS = ["Australia", "Ontario", "UAE", "UK", "US"];
const CONTENT_COLUMNS = [
  "question_text",
  "question_svg",
  "visual_mode",
  "subject",
  "grade",
  "topic",
  "subtopic",
  "learning_objective",
  "blooms_level",
  "difficulty_level",
  "options",
  "explanation",
  "generation_metadata",
];

const REGION_MONEY = {
  Australia: {
    majorSymbol: "$",
    majorSingular: "dollar",
    majorPlural: "dollars",
    subSingular: "cent",
    subPlural: "cents",
    subShort: "c",
    coinSub: [5, 10, 20, 50],
    coinMajor: [1, 2],
    noteMajor: [5, 10, 20, 50, 100],
  },
  Ontario: {
    majorSymbol: "$",
    majorSingular: "dollar",
    majorPlural: "dollars",
    subSingular: "cent",
    subPlural: "cents",
    subShort: "c",
    coinSub: [5, 10, 25, 50],
    coinMajor: [1, 2],
    noteMajor: [5, 10, 20, 50, 100],
  },
  UAE: {
    majorSymbol: "AED ",
    majorSingular: "dirham",
    majorPlural: "dirhams",
    subSingular: "fil",
    subPlural: "fils",
    subShort: " fils",
    coinSub: [1, 5, 10, 25, 50],
    coinMajor: [1],
    noteMajor: [5, 10, 20, 50, 100, 200, 500, 1000],
  },
  UK: {
    majorSymbol: "£",
    majorSingular: "pound",
    majorPlural: "pounds",
    subSingular: "penny",
    subPlural: "pence",
    subShort: "p",
    coinSub: [1, 2, 5, 10, 20, 50],
    coinMajor: [1, 2],
    noteMajor: [5, 10, 20, 50],
  },
  US: {
    majorSymbol: "$",
    majorSingular: "dollar",
    majorPlural: "dollars",
    subSingular: "cent",
    subPlural: "cents",
    subShort: "c",
    coinSub: [1, 5, 10, 25, 50],
    coinMajor: [1],
    noteMajor: [1, 2, 5, 10, 20, 50, 100],
  },
};

const IGNORED_METADATA_KEYS = new Set([
  "grade",
  "questionNumber",
  "questionType",
  "sourceQuestionType",
  "sourceQueueId",
]);

function indexByHeader(header) {
  return Object.fromEntries(header.map((name, index) => [name, index]));
}

function rowToObject(header, row) {
  return Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""]));
}

function objectToRow(header, object) {
  return header.map((name) => object[name] ?? "");
}

async function readCsv(file, sheetName) {
  const text = await fs.readFile(file, "utf8");
  const workbook = await Workbook.fromCSV(text, { sheetName });
  const values = workbook.worksheets.getItem(sheetName).getUsedRange(true).values;
  return { header: values[0], rows: values.slice(1) };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function stableUuid(sourceId, region) {
  const bytes = crypto.createHash("sha256").update(`drgdrop-family-complete-v1:${sourceId}:${region}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseJson(value, field, id) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${field} JSON for ${id}: ${error.message}`);
  }
}

function collectStrings(value, strings, key = "") {
  if (IGNORED_METADATA_KEYS.has(key)) return;
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings, key);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectStrings(childValue, strings, childKey);
    }
  }
}

function contentText(row) {
  const strings = [
    row.question_text,
    row.explanation,
    row.topic,
    row.subtopic,
    row.learning_objective,
  ].filter(Boolean);
  collectStrings(parseJson(row.generation_metadata, "generation_metadata", row.id), strings);
  collectStrings(parseJson(row.options, "options", row.id), strings);
  return strings.join("\n");
}

function classifySensitivity(row) {
  const text = contentText(row);
  const currency =
    /₹|\$\s*\d|\d\s*¢|\b(?:dollars?|cents?|rupees?)\b|\b\d+(?:\.\d+)?c\b/i.test(text);
  const metric =
    /\b(?:millimet(?:er|re)s?|centimet(?:er|re)s?|kilomet(?:er|re)s?|met(?:er|re)s?|millilit(?:er|re)s?|lit(?:er|re)s?|kilograms?|grams?|milligrams?|hectares?)\b/i.test(text) ||
    /\b\d+(?:\.\d+)?\s*(?:mm|cm|km|kg|mg|ml)\b/i.test(text) ||
    /°\s*c\b|\bdegrees?\s+celsius\b/i.test(text);
  const imperial =
    /\b(?:inches?|feet|foot|yards|miles?|ounces?|pounds?|gallons?|pints?)\b/i.test(text) ||
    /\b\d+(?:\.\d+)?\s*yard\b/i.test(text) ||
    /\b\d+(?:\.\d+)?\s*(?:ft|yd|mi|lb|lbs|oz)\b/i.test(text) ||
    /°\s*f\b|\bdegrees?\s+fahrenheit\b/i.test(text);
  return { currency, metric, imperial, sensitive: currency || metric || imperial };
}

function transformStrings(value, transform, key = "") {
  if (typeof value === "string") return transform(value, key);
  if (Array.isArray(value)) return value.map((item) => transformStrings(item, transform, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        transformStrings(childValue, transform, childKey),
      ]),
    );
  }
  return value;
}

function moneyObjectTokens(strings) {
  const found = new Map();
  const patterns = [
    /\$\s*(\d+(?:\.\d+)?)\s+(coin|coins|note|notes)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*[- ]?(cent|cents|dollar|dollars)\s+(coin|coins|note|notes)\b/gi,
  ];
  for (const text of strings) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const value = Number(match[1]);
        const form = match[2].toLowerCase();
        const type = (match[3] ?? match[2]).toLowerCase().startsWith("coin") ? "coin" : "note";
        const unit = match[3] ? (form.startsWith("cent") ? "sub" : "major") : "major";
        const key = `${unit}:${value}:${type}`;
        found.set(key, { key, unit, value, type });
      }
    }
  }
  return [...found.values()];
}

function renderValidObject(region, denomination, type) {
  const money = REGION_MONEY[region];
  if (denomination.unit === "sub") {
    if (region === "UK") return `${denomination.value}p ${type}`;
    if (region === "UAE") return `${denomination.value}-fils ${type}`;
    return `${denomination.value}-cent ${type}`;
  }
  return `${money.majorSymbol}${denomination.value} ${type}`;
}

function directDenomination(region, token) {
  const money = REGION_MONEY[region];
  if (token.type === "coin" && token.unit === "sub" && money.coinSub.includes(token.value)) {
    return { unit: "sub", value: token.value };
  }
  if (token.type === "coin" && token.unit === "major" && money.coinMajor.includes(token.value)) {
    return { unit: "major", value: token.value };
  }
  if (token.type === "note" && token.unit === "major" && money.noteMajor.includes(token.value)) {
    return { unit: "major", value: token.value };
  }
  return null;
}

function classificationMoneyMap(region, strings) {
  const tokens = moneyObjectTokens(strings);
  const used = { coin: new Set(), note: new Set() };
  const result = new Map();
  for (const token of tokens) {
    const direct = directDenomination(region, token);
    if (direct) {
      const key = `${direct.unit}:${direct.value}`;
      if (!used[token.type].has(key)) {
        used[token.type].add(key);
        result.set(token.key, renderValidObject(region, direct, token.type));
      }
    }
  }
  for (const token of tokens) {
    if (result.has(token.key)) continue;
    const money = REGION_MONEY[region];
    const candidates = token.type === "note"
      ? money.noteMajor.map((value) => ({ unit: "major", value }))
      : [
          ...money.coinSub.map((value) => ({ unit: "sub", value })),
          ...money.coinMajor.map((value) => ({ unit: "major", value })),
        ];
    const denomination = candidates.find((candidate) => !used[token.type].has(`${candidate.unit}:${candidate.value}`));
    if (!denomination) throw new Error(`Not enough ${region} ${token.type} denominations`);
    used[token.type].add(`${denomination.unit}:${denomination.value}`);
    result.set(token.key, renderValidObject(region, denomination, token.type));
  }
  return result;
}

function replaceMoneyObjects(text, region, classificationMap) {
  const placeholders = [];
  const put = (replacement) => {
    const token = `ZZMONEYOBJECT${placeholders.length}ZZ`;
    placeholders.push(replacement);
    return token;
  };
  const replaceToken = (unit, valueText, type) => {
    const value = Number(valueText);
    const token = { key: `${unit}:${value}:${type}`, unit, value, type };
    if (classificationMap) return put(classificationMap.get(token.key));
    const direct = directDenomination(region, token);
    if (direct) return put(renderValidObject(region, direct, type));
    const money = REGION_MONEY[region];
    if (type === "coin") {
      if (unit === "sub") {
        const amount = value === 1 ? money.subSingular : money.subPlural;
        return put(`${value} ${amount} in coins`);
      }
      return put(`${money.majorSymbol}${value} in coins`);
    }
    return put(`${money.majorSymbol}${value} in notes`);
  };

  let output = text
    .replace(/\$\s*(\d+(?:\.\d+)?)\s+(coin|coins|note|notes)\b/gi, (_, value, form) =>
      replaceToken("major", value, form.toLowerCase().startsWith("coin") ? "coin" : "note"),
    )
    .replace(/\b(\d+(?:\.\d+)?)\s*[- ]?(cent|cents|dollar|dollars)\s+(coin|coins|note|notes)\b/gi, (_, value, unitWord, form) =>
      replaceToken(unitWord.toLowerCase().startsWith("cent") ? "sub" : "major", value, form.toLowerCase().startsWith("coin") ? "coin" : "note"),
    );

  return {
    text: output,
    restore(value) {
      let restored = value;
      placeholders.forEach((replacement, index) => {
        restored = restored.replaceAll(`ZZMONEYOBJECT${index}ZZ`, replacement);
      });
      return restored;
    },
  };
}

function localizeCurrencyString(text, region, classificationMap = null) {
  const money = REGION_MONEY[region];
  const objects = replaceMoneyObjects(text, region, classificationMap);
  let output = objects.text;

  if (["Australia", "Ontario", "US"].includes(region)) {
    output = output
      .replace(/₹\s*/g, "$")
      .replace(/\b(\d+(?:[,.]\d+)*)\s+rupees?\b/gi, "$$$1")
      .replace(/\brupees\b/gi, "dollars")
      .replace(/\brupee\b/gi, "dollar");
  } else if (region === "UK") {
    output = output
      .replace(/₹\s*/g, "£")
      .replace(/\$\s*(\d+(?:[,.]\d+)*)/g, "£$1")
      .replace(/\b(\d+(?:[,.]\d+)*)\s+(?:dollars?|rupees?)\b/gi, "£$1")
      .replace(/\b(\d+(?:[,.]\d+)*)\s+cents?\b/gi, (_, value) => `${value} ${Number(value.replaceAll(",", "")) === 1 ? "penny" : "pence"}`)
      .replace(/\b(\d+(?:\.\d+)?)c\b/gi, "$1p")
      .replace(/(\d+(?:\.\d+)?)\s*¢/g, "$1p")
      .replace(/\bdollars\b/gi, "pounds")
      .replace(/\bdollar\b/gi, "pound")
      .replace(/\brupees\b/gi, "pounds")
      .replace(/\brupee\b/gi, "pound")
      .replace(/\bcents\b/gi, "pence")
      .replace(/\bcent\b/gi, "penny");
  } else if (region === "UAE") {
    output = output
      .replace(/₹\s*/g, "AED ")
      .replace(/\$\s*(\d+(?:[,.]\d+)*)/g, "AED $1")
      .replace(/\b(\d+(?:[,.]\d+)*)\s+(?:dollars?|rupees?)\b/gi, "AED $1")
      .replace(/\b(\d+(?:[,.]\d+)*)\s+cents?\b/gi, (_, value) => `${value} ${Number(value.replaceAll(",", "")) === 1 ? "fil" : "fils"}`)
      .replace(/\b(\d+(?:\.\d+)?)c\b/gi, "$1 fils")
      .replace(/(\d+(?:\.\d+)?)\s*¢/g, "$1 fils")
      .replace(/\bdollars\b/gi, "dirhams")
      .replace(/\bdollar\b/gi, "dirham")
      .replace(/\brupees\b/gi, "dirhams")
      .replace(/\brupee\b/gi, "dirham")
      .replace(/\bcents\b/gi, "fils")
      .replace(/\bcent\b/gi, "fil");
    if (!classificationMap) {
      output = output
        .replace(/\bCount the coins\b/gi, "Add the money amounts")
        .replace(/\bcoin or note\b/gi, "money amount")
        .replace(/\bcoins or notes\b/gi, "money amounts");
    }
  }
  return objects.restore(output);
}

function payloadStrings(metadata) {
  const strings = [];
  collectStrings(metadata, strings);
  return strings;
}

function localizeRow(source, region, forceCurrency = false) {
  const output = { ...source };
  const sensitivity = classifySensitivity(source);
  if (sensitivity.currency || forceCurrency) {
    const metadata = parseJson(source.generation_metadata, "generation_metadata", source.id);
    const targetLabels = metadata.payload?.targets?.map((target) => target.label).filter(Boolean) ?? [];
    const isClassification = targetLabels.some((label) => /\b(?:coin|coins|note|notes)\b/i.test(label));
    const strings = payloadStrings(metadata);
    strings.push(source.question_text, source.explanation);
    const classificationMap = isClassification ? classificationMoneyMap(region, strings) : null;
    const localize = (value) => localizeCurrencyString(value, region, classificationMap);
    for (const column of CONTENT_COLUMNS) {
      if (column === "generation_metadata") {
        output[column] = JSON.stringify(transformStrings(metadata, localize));
      } else if (column === "options") {
        output[column] = JSON.stringify(transformStrings(parseJson(source.options, "options", source.id), localize));
      } else {
        output[column] = localize(source[column]);
      }
    }
  }
  output.id = stableUuid(source.id, region);
  output.region = region;
  output.parent_id = source.id;
  return output;
}

function repairExistingLocalRow(source) {
  const sensitivity = classifySensitivity(source);
  if (!sensitivity.currency) return source;
  const repaired = localizeRow(source, source.region, true);
  repaired.id = source.id;
  repaired.parent_id = source.parent_id;
  return repaired;
}

function addIssue(issues, severity, category, row, field, message) {
  issues.push([
    severity,
    category,
    row.id,
    row.parent_id,
    row.region,
    field,
    message,
  ]);
}

function validatePayload(row, issues) {
  let metadata;
  try {
    metadata = JSON.parse(row.generation_metadata);
    JSON.parse(row.options);
  } catch (error) {
    addIssue(issues, "error", "json", row, "generation_metadata/options", error.message);
    return;
  }
  const payload = metadata.payload;
  if (!payload) {
    addIssue(issues, "error", "payload", row, "generation_metadata", "Missing payload");
    return;
  }
  const itemIds = new Set((payload.items ?? []).map((item) => item.id));
  const targetIds = new Set((payload.targets ?? []).map((target) => target.id));
  if (itemIds.size !== (payload.items ?? []).length) addIssue(issues, "error", "payload", row, "items", "Duplicate item IDs");
  if (targetIds.size !== (payload.targets ?? []).length) addIssue(issues, "error", "payload", row, "targets", "Duplicate target IDs");
  for (const answer of payload.answerKey ?? []) {
    if (!itemIds.has(answer.itemId)) addIssue(issues, "error", "answer_key", row, "answerKey", `Unknown itemId ${answer.itemId}`);
    if (!targetIds.has(answer.targetId)) addIssue(issues, "error", "answer_key", row, "answerKey", `Unknown targetId ${answer.targetId}`);
  }
}

function validateCurrency(row, issues) {
  const text = contentText(row);
  const forbidden = {
    Australia: /₹|£|\bAED\b|\b(?:dirhams?|fils?|pence|penny|pounds?)\b/i,
    Ontario: /₹|£|\bAED\b|\b(?:dirhams?|fils?|pence|penny|pounds?)\b/i,
    US: /₹|£|\bAED\b|\b(?:dirhams?|fils?|pence|penny|pounds?)\b/i,
    UK: /₹|\$|\bAED\b|\b(?:dollars?|cents?|rupees?|dirhams?|fils?)\b|\b\d+(?:\.\d+)?c\b/i,
    UAE: /₹|£|\$|\b(?:dollars?|cents?|rupees?|pence|penny|pounds?)\b|\b\d+(?:\.\d+)?c\b/i,
  }[row.region];
  if (forbidden?.test(text)) {
    addIssue(issues, "error", "currency", row, "content", "Contains currency terminology from another region");
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sourceCsv = await readCsv(SOURCE_FILE, "Source");
  const oldManifestCsv = await readCsv(OLD_MANIFEST_FILE, "OldManifest");
  const sourceRows = sourceCsv.rows.map((row) => rowToObject(sourceCsv.header, row));
  const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
  const oldManifestIndex = indexByHeader(oldManifestCsv.header);
  const oldManifestById = new Map(
    oldManifestCsv.rows.map((row) => [row[oldManifestIndex.source_id], rowToObject(oldManifestCsv.header, row)]),
  );
  const candidateIds = oldManifestCsv.rows.map((row) => row[oldManifestIndex.source_id]);
  const candidates = candidateIds.map((id) => {
    const row = sourceById.get(id);
    if (!row) throw new Error(`Manifest source ${id} is missing from drgdrop_fixed.csv`);
    return row;
  });

  const classifyWithManifest = (row) => {
    const detected = classifySensitivity(row);
    const oldEntry = oldManifestById.get(row.id);
    const manifestMetric = oldEntry ? ["metric_units", "mixed_units"].includes(oldEntry.unit_class) : false;
    const knownFalseImperialBucket = oldEntry?.unit_class === "imperial_units";
    const flags = {
      currency: detected.currency,
      metric: knownFalseImperialBucket ? false : detected.metric || manifestMetric,
      imperial: knownFalseImperialBucket ? false : detected.imperial,
    };
    flags.sensitive = flags.currency || flags.metric || flags.imperial;
    return { row, flags };
  };
  const classifiedCandidates = candidates.map(classifyWithManifest);
  const candidateNeutral = classifiedCandidates.filter(({ flags }) => !flags.sensitive).map(({ row }) => row);
  const classifiedGlobal = sourceRows.filter((row) => row.region === "global").map(classifyWithManifest);
  const neutralGlobal = classifiedGlobal.filter(({ flags }) => !flags.sensitive).map(({ row }) => row);
  const sensitive = classifiedGlobal.filter(({ flags }) => flags.sensitive);
  const classCounts = classifiedGlobal.reduce(
    (counts, { flags }) => {
      if (flags.currency) counts.currency += 1;
      if (flags.metric) counts.metric += 1;
      if (flags.imperial) counts.imperial += 1;
      if (flags.metric && flags.imperial) counts.mixed += 1;
      return counts;
    },
    { currency: 0, metric: 0, imperial: 0, mixed: 0 },
  );

  console.log(JSON.stringify({
    preliminaryClassification: {
      candidates: candidates.length,
      candidateNeutral: candidateNeutral.length,
      allGlobal: classifiedGlobal.length,
      neutralGlobal: neutralGlobal.length,
      sensitiveGlobal: sensitive.length,
      ...classCounts,
    },
  }, null, 2));

  if (candidates.length !== 1412) {
    throw new Error(`Unexpected candidate count: ${candidates.length}`);
  }

  const sensitiveIds = new Set(sensitive.map(({ row }) => row.id));
  const correctedGlobalObjects = sourceRows
    .filter((row) => !sensitiveIds.has(row.id))
    .map((row) => (REGIONS.includes(row.region) ? repairExistingLocalRow(row) : row));
  const correctedIds = new Set();
  for (const row of correctedGlobalObjects) {
    if (correctedIds.has(row.id)) throw new Error(`Duplicate corrected-global ID ${row.id}`);
    correctedIds.add(row.id);
  }

  const variants = [];
  const manifestRows = [];
  for (const { row, flags } of sensitive) {
    const sensitivity = [flags.currency ? "currency" : null, flags.metric ? "metric" : null, flags.imperial ? "imperial" : null]
      .filter(Boolean)
      .join("+");
    for (const region of REGIONS) {
      const variant = localizeRow(row, region, flags.currency);
      variants.push(variant);
      manifestRows.push([
        row.id,
        sensitivity,
        region,
        variant.id,
        row.id,
        flags.currency ? "localized_currency;preserved_numbers_and_answer_mapping" : "copied_unit_question;preserved_numbers_and_answer_mapping",
        "pending_validation",
      ]);
    }
  }

  const finalObjects = [...correctedGlobalObjects, ...variants];
  const issues = [];
  const finalIds = new Set();
  const finalRegionCounts = {};
  for (const row of finalObjects) {
    finalRegionCounts[row.region] = (finalRegionCounts[row.region] ?? 0) + 1;
    if (finalIds.has(row.id)) addIssue(issues, "error", "duplicate_id", row, "id", "Duplicate ID in final file");
    finalIds.add(row.id);
    validatePayload(row, issues);
    if (REGIONS.includes(row.region)) validateCurrency(row, issues);
    if (row.region === "global" && classifySensitivity(row).sensitive) {
      addIssue(issues, "error", "global_sensitivity", row, "content", "Global row contains a currency or measurement unit");
    }
  }

  const familyRegions = new Map();
  for (const row of variants) {
    if (!familyRegions.has(row.parent_id)) familyRegions.set(row.parent_id, new Set());
    familyRegions.get(row.parent_id).add(row.region);
  }
  for (const { row } of sensitive) {
    const regions = familyRegions.get(row.id) ?? new Set();
    if (regions.size !== REGIONS.length || REGIONS.some((region) => !regions.has(region))) {
      addIssue(issues, "error", "family_coverage", row, "region", `Family has regions: ${[...regions].join("|")}`);
    }
  }

  const originalLocalCounts = sourceRows.reduce((counts, row) => {
    if (REGIONS.includes(row.region)) counts[row.region] = (counts[row.region] ?? 0) + 1;
    return counts;
  }, {});
  const expectedRegionCounts = Object.fromEntries(REGIONS.map((region) => [region, originalLocalCounts[region] + sensitive.length]));
  const expectedCounts = { global: neutralGlobal.length, ...expectedRegionCounts };
  for (const [region, expected] of Object.entries(expectedCounts)) {
    if (finalRegionCounts[region] !== expected) {
      issues.push(["error", "region_count", "", "", region, "region", `Expected ${expected}, got ${finalRegionCounts[region] ?? 0}`]);
    }
  }
  const expectedVariants = sensitive.length * REGIONS.length;
  const expectedCorrected = sourceRows.length - sensitive.length;
  const expectedFinal = sourceRows.length + sensitive.length * (REGIONS.length - 1);
  if (variants.length !== expectedVariants) issues.push(["error", "variant_count", "", "", "", "rows", `Expected ${expectedVariants}, got ${variants.length}`]);
  if (correctedGlobalObjects.length !== expectedCorrected) issues.push(["error", "corrected_count", "", "", "", "rows", `Expected ${expectedCorrected}, got ${correctedGlobalObjects.length}`]);
  if (finalObjects.length !== expectedFinal) issues.push(["error", "final_count", "", "", "", "rows", `Expected ${expectedFinal}, got ${finalObjects.length}`]);

  const errorCount = issues.filter((issue) => issue[0] === "error").length;
  for (const row of manifestRows) row[6] = errorCount === 0 ? "passed" : "review_issues_file";

  const summary = {
    dryRun,
    sourceRows: sourceRows.length,
    candidates: candidates.length,
    restoredNeutralGlobal: candidateNeutral.length,
    regionalFamilies: sensitive.length,
    variants: variants.length,
    correctedGlobalRows: correctedGlobalObjects.length,
    finalRows: finalObjects.length,
    finalRegionCounts,
    classCounts,
    issues: issues.length,
    errors: errorCount,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun && issues.length) {
    const issueCounts = issues.reduce((counts, issue) => {
      counts[issue[1]] = (counts[issue[1]] ?? 0) + 1;
      return counts;
    }, {});
    console.log(JSON.stringify({ issueCounts, sampleIssues: issues.slice(0, 30) }, null, 2));
  }

  if (dryRun) return;

  await Promise.all([
    fs.writeFile(OUTPUTS.correctedGlobal, toCsv(sourceCsv.header, correctedGlobalObjects.map((row) => objectToRow(sourceCsv.header, row))), "utf8"),
    fs.writeFile(OUTPUTS.variants, toCsv(sourceCsv.header, variants.map((row) => objectToRow(sourceCsv.header, row))), "utf8"),
    fs.writeFile(OUTPUTS.final, toCsv(sourceCsv.header, finalObjects.map((row) => objectToRow(sourceCsv.header, row))), "utf8"),
    fs.writeFile(
      OUTPUTS.manifest,
      toCsv(
        ["source_id", "sensitivity", "target_region", "variant_id", "parent_id", "transformation", "validation_status"],
        manifestRows,
      ),
      "utf8",
    ),
    fs.writeFile(
      OUTPUTS.issues,
      toCsv(["severity", "category", "row_id", "parent_id", "region", "field", "message"], issues),
      "utf8",
    ),
  ]);

  if (errorCount > 0) process.exitCode = 2;
}

await main();
