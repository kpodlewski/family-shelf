import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { neon } from "@neondatabase/serverless";

const envPath = new URL("../.env.local", import.meta.url);
const defaultInputPath = new URL("../entry-data.txt", import.meta.url);
const inputPath = process.argv[2]
  ? pathToFileURL(isAbsolute(process.argv[2]) ? process.argv[2] : resolve(process.cwd(), process.argv[2]))
  : defaultInputPath;
const schemaPath = new URL("./catalog-schema.sql", import.meta.url);

const expectedHeader = ["title", "status", "borrower", "note", "category"];
const spaceAlignedHeader = ["title", "status", "borrowed", "note", "category"];

const statusMap = new Map([
  ["available", "available"],
  ["borrowed", "borrowed"],
]);

const categoryMap = new Map([
  ["book", "book"],
  ["board game", "board-game"],
  ["board-game", "board-game"],
  ["video game", "video-game"],
  ["video-game", "video-game"],
]);

async function loadLocalEnv() {
  try {
    const source = await readFile(envPath, "utf8");

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex);
      const rawValue = trimmed.slice(separatorIndex + 1);
      const value = rawValue.replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch {
    // Local developer imports may use .env.local; hosted environments inject env vars.
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  assert.ok(
    databaseUrl,
    "DATABASE_URL or POSTGRES_URL should be configured for entry seeding",
  );

  return databaseUrl;
}

function normalizeCell(value) {
  return value.trim();
}

function normalizeKey(value) {
  return normalizeCell(value).replace(/\s+/g, " ").toLowerCase();
}

function toNullable(value) {
  const normalized = normalizeCell(value);

  return normalized ? normalized : null;
}

function slugify(value) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entry"
  );
}

function makeEntryId(title, kind) {
  const hash = createHash("sha1")
    .update(`${kind}\0${title}`, "utf8")
    .digest("hex")
    .slice(0, 10);

  return `initial-${slugify(title).slice(0, 48)}-${hash}`;
}

function parseHeader(line) {
  if (!line.includes("\t")) {
    const header = line.trim().split(/\s+/).map((cell) => cell.trim().toLowerCase());

    assert.deepEqual(
      header,
      spaceAlignedHeader,
      `space-aligned entry header should be exactly: ${spaceAlignedHeader.join(" ")}`,
    );

    return "space-aligned";
  }

  const header = line.split("\t").map((cell) => cell.trim().toLowerCase());

  assert.deepEqual(
    header,
    expectedHeader,
    `entry data header should be exactly: ${expectedHeader.join("\\t")}`,
  );

  return "tsv";
}

function parseTsvEntry(line, lineNumber) {
  const cells = line.split("\t");

  assert.equal(
    cells.length,
    expectedHeader.length,
    `entry data line ${lineNumber} should have ${expectedHeader.length} tab-separated columns, got ${cells.length}`,
  );

  const [rawTitle, rawStatus, rawBorrower, rawNote, rawCategory] = cells;
  const title = normalizeCell(rawTitle);
  const status = statusMap.get(normalizeCell(rawStatus).toLowerCase());
  const kind = categoryMap.get(normalizeCell(rawCategory).toLowerCase());

  assert.ok(title, `entry data line ${lineNumber} should have a title`);
  assert.ok(
    status,
    `entry data line ${lineNumber} has unsupported status "${rawStatus}"`,
  );
  assert.ok(
    kind,
    `entry data line ${lineNumber} has unsupported category "${rawCategory}"`,
  );

  return {
    id: makeEntryId(title, kind),
    title,
    kind,
    status,
    borrowerName: toNullable(rawBorrower),
    note: toNullable(rawNote),
  };
}

function parseSpaceAlignedEntry(line, lineNumber) {
  const normalizedLine = line.trim().replace(/\s+/g, " ");
  const match = normalizedLine.match(
    /^(.*?)\s+(available|borrowed)\s+(.*?)\s+(book|board game|board-game|video game|video-game)$/i,
  );

  assert.ok(
    match,
    `entry data line ${lineNumber} should match: title status note category`,
  );

  const [, rawTitle, rawStatus, rawNote, rawCategory] = match;
  const title = normalizeCell(rawTitle);
  const status = statusMap.get(normalizeCell(rawStatus).toLowerCase());
  const kind = categoryMap.get(normalizeCell(rawCategory).toLowerCase());

  assert.ok(title, `entry data line ${lineNumber} should have a title`);
  assert.ok(
    status,
    `entry data line ${lineNumber} has unsupported status "${rawStatus}"`,
  );
  assert.ok(
    kind,
    `entry data line ${lineNumber} has unsupported category "${rawCategory}"`,
  );

  return {
    id: makeEntryId(title, kind),
    title,
    kind,
    status,
    borrowerName: null,
    note: toNullable(rawNote),
  };
}

async function readEntries() {
  const source = await readFile(inputPath, "utf8");
  const lines = source.split(/\r?\n/);
  const firstLineIndex = lines.findIndex((line) => line.trim());

  assert.notEqual(firstLineIndex, -1, "entry data file should not be empty");
  const format = parseHeader(lines[firstLineIndex]);
  const parseEntry = format === "tsv" ? parseTsvEntry : parseSpaceAlignedEntry;

  return lines
    .slice(firstLineIndex + 1)
    .map((line, index) => ({ line, lineNumber: firstLineIndex + index + 2 }))
    .filter(({ line }) => line.trim())
    .map(({ line, lineNumber }) => parseEntry(line, lineNumber));
}

await loadLocalEnv();

const entries = await readEntries();
assert.ok(entries.length > 0, "entry data file should contain at least one entry");

const ids = new Set(entries.map((entry) => entry.id));
assert.equal(ids.size, entries.length, "entry data entries should produce unique ids");

const sql = neon(getDatabaseUrl());
const schema = await readFile(schemaPath, "utf8");
await sql.query(schema);

let insertedCount = 0;
let skippedCount = 0;

const existingRows = await sql`
  SELECT title, kind
  FROM catalog_items
`;
const existingKeys = new Set(
  existingRows.map((row) => `${normalizeKey(row.title)}\0${row.kind}`),
);
const importedKeys = new Set();

for (const entry of entries) {
  const entryKey = `${normalizeKey(entry.title)}\0${entry.kind}`;

  if (existingKeys.has(entryKey) || importedKeys.has(entryKey)) {
    skippedCount += 1;
    continue;
  }

  const rows = await sql`
    INSERT INTO catalog_items (
      id,
      title,
      kind,
      status,
      borrower_name,
      borrowed_date,
      note
    )
    VALUES (
      ${entry.id},
      ${entry.title},
      ${entry.kind},
      ${entry.status},
      ${entry.borrowerName},
      ${null},
      ${entry.note}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;

  if (rows.length > 0) {
    insertedCount += 1;
    existingKeys.add(entryKey);
    importedKeys.add(entryKey);
  } else {
    skippedCount += 1;
  }
}

console.log(
  `Entry seed completed from ${inputPath.pathname}. Inserted ${insertedCount}, skipped ${skippedCount}, source rows ${entries.length}.`,
);
