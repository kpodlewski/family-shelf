import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { neon } from "@neondatabase/serverless";

const envPath = new URL("../.env.local", import.meta.url);
const inputPath = new URL("../entry-data.txt", import.meta.url);
const schemaPath = new URL("./catalog-schema.sql", import.meta.url);

const expectedHeader = ["title", "status", "borrower", "note", "category"];

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
  const header = line.split("\t").map((cell) => cell.trim().toLowerCase());

  assert.deepEqual(
    header,
    expectedHeader,
    `entry-data.txt header should be exactly: ${expectedHeader.join("\\t")}`,
  );
}

function parseEntry(line, lineNumber) {
  const cells = line.split("\t");

  assert.equal(
    cells.length,
    expectedHeader.length,
    `entry-data.txt line ${lineNumber} should have ${expectedHeader.length} tab-separated columns, got ${cells.length}`,
  );

  const [rawTitle, rawStatus, rawBorrower, rawNote, rawCategory] = cells;
  const title = normalizeCell(rawTitle);
  const status = statusMap.get(normalizeCell(rawStatus).toLowerCase());
  const kind = categoryMap.get(normalizeCell(rawCategory).toLowerCase());

  assert.ok(title, `entry-data.txt line ${lineNumber} should have a title`);
  assert.ok(
    status,
    `entry-data.txt line ${lineNumber} has unsupported status "${rawStatus}"`,
  );
  assert.ok(
    kind,
    `entry-data.txt line ${lineNumber} has unsupported category "${rawCategory}"`,
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

async function readEntries() {
  const source = await readFile(inputPath, "utf8");
  const lines = source.split(/\r?\n/);
  const firstLineIndex = lines.findIndex((line) => line.trim());

  assert.notEqual(firstLineIndex, -1, "entry-data.txt should not be empty");
  parseHeader(lines[firstLineIndex]);

  return lines
    .slice(firstLineIndex + 1)
    .map((line, index) => ({ line, lineNumber: firstLineIndex + index + 2 }))
    .filter(({ line }) => line.trim())
    .map(({ line, lineNumber }) => parseEntry(line, lineNumber));
}

await loadLocalEnv();

const entries = await readEntries();
assert.ok(entries.length > 0, "entry-data.txt should contain at least one entry");

const ids = new Set(entries.map((entry) => entry.id));
assert.equal(ids.size, entries.length, "entry-data.txt entries should produce unique ids");

const sql = neon(getDatabaseUrl());
const schema = await readFile(schemaPath, "utf8");
await sql.query(schema);

let insertedCount = 0;
let skippedCount = 0;

for (const entry of entries) {
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
  } else {
    skippedCount += 1;
  }
}

console.log(
  `Entry seed completed. Inserted ${insertedCount}, skipped ${skippedCount}, source rows ${entries.length}.`,
);
