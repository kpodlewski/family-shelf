import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { neon } from "@neondatabase/serverless";

const envPath = new URL("../.env.local", import.meta.url);
const schemaPath = new URL("./catalog-schema.sql", import.meta.url);

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
    // Vercel injects env vars in preview/production; local runs may use .env.local.
  }
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  assert.ok(
    databaseUrl,
    "DATABASE_URL or POSTGRES_URL should be configured for catalog checks",
  );

  return databaseUrl;
}

const seedItems = [
  {
    id: "dune-book",
    title: "Dune",
    kind: "book",
    status: "borrowed",
    borrowerName: "Marta",
    borrowedDate: null,
    note: "Borrowed by Marta",
  },
  {
    id: "catan-board-game",
    title: "Catan",
    kind: "board-game",
    status: "available",
    borrowerName: null,
    borrowedDate: null,
    note: "Shelf A",
  },
  {
    id: "hades-video-game",
    title: "Hades",
    kind: "video-game",
    status: "borrowed",
    borrowerName: "Piotr",
    borrowedDate: null,
    note: "Borrowed by Piotr",
  },
];

const contractRunId = `contract-${Date.now().toString(36)}`;

const catalogItemKindSearchLabels = {
  book: "book ksiazka",
  "board-game": "board game gra planszowa",
  "video-game": "video game gra komputerowa gra pc",
};

function getSearchText(item) {
  return [
    item.title,
    catalogItemKindSearchLabels[item.kind],
    item.borrowerName,
    item.borrowedDate,
    item.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function searchItems(items, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => getSearchText(item).includes(normalizedQuery));
}

function rowToItem(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    borrowerName: row.borrower_name,
    borrowedDate: row.borrowed_date,
    note: row.note,
  };
}

await loadLocalEnv();

const sql = neon(getDatabaseUrl());
const schema = await readFile(schemaPath, "utf8");
await sql.query(schema);

await sql`
  DELETE FROM catalog_items
  WHERE id LIKE ${"contract-%"}
    OR title LIKE ${"Duplicate Contract contract-%"}
`;

for (const item of seedItems) {
  await sql`
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
      ${item.id},
      ${item.title},
      ${item.kind},
      ${item.status},
      ${item.borrowerName},
      ${item.borrowedDate},
      ${item.note}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

const rows = await sql`
  SELECT id, title, kind, status, borrower_name, borrowed_date, note
  FROM catalog_items
  ORDER BY created_at ASC, title ASC
`;
const items = rows.map(rowToItem);

for (const seedItem of seedItems) {
  assert.ok(
    items.some((item) => item.id === seedItem.id),
    `seed item ${seedItem.id} should exist in the database`,
  );
}

const ids = new Set(items.map((item) => item.id));
assert.equal(ids.size, items.length, "catalog item ids should be unique");

const supportedStatuses = new Set(["available", "borrowed"]);
const supportedKinds = new Set(["book", "board-game", "video-game"]);

for (const item of items) {
  assert.ok(item.id, "catalog item should have an id");
  assert.ok(item.title, `catalog item ${item.id} should have a title`);
  assert.ok(supportedStatuses.has(item.status), `${item.id} has unsupported status`);
  assert.ok(supportedKinds.has(item.kind), `${item.id} has unsupported kind`);
}

assert.ok(items.find((item) => item.id === "dune-book"), "get by id should find an existing item");
assert.equal(items.find((item) => item.id === "missing-item") ?? null, null, "get by id should return null for missing items");

assert.equal(searchItems(items, "dune").length, 1, "search should find an item by title");
assert.equal(searchItems(items, "DUNE").length, 1, "search should find an item by title case-insensitively");
assert.equal(searchItems(items, "Marta").length, 1, "search should find an item by borrower");
assert.equal(searchItems(items, "Shelf A").length, 1, "search should find an item by note");
assert.equal(searchItems(items, "gra planszowa").length, 1, "search should find an item by kind label");
assert.equal(searchItems(items, "").length, items.length, "empty search should return all items");
assert.equal(searchItems(items, "   ").length, items.length, "whitespace search should return all items");
assert.equal(searchItems(items, "not-in-this-catalog").length, 0, "unmatched search should return no items");

const duplicateTitle = `Duplicate Contract ${contractRunId}`;

try {
  const createdRows = await sql`
    INSERT INTO catalog_items (id, title, kind, status, note)
    VALUES
      (${`${contractRunId}-one`}, ${duplicateTitle}, ${"book"}, ${"available"}, ${"first note"}),
      (${`${contractRunId}-two`}, ${duplicateTitle}, ${"book"}, ${"available"}, ${null})
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `;
  const createdItems = createdRows.map(rowToItem);

  assert.equal(createdItems.length, 2, "create contract should allow duplicate titles");
  assert.notEqual(createdItems[0].id, createdItems[1].id, "duplicate titles should keep distinct ids");
  assert.equal(createdItems[0].title, duplicateTitle, "created item should keep the validated title");
  assert.equal(createdItems[0].note, "first note", "created item should store note text");
  assert.equal(createdItems[1].note, null, "created item should allow a nullable note");

  await assert.rejects(
    () => sql`
      INSERT INTO catalog_items (id, title, kind, status)
      VALUES (${`${contractRunId}-empty-title`}, ${"   "}, ${"book"}, ${"available"})
    `,
    /title|constraint|violates/i,
    "database contract should reject blank titles",
  );
} finally {
  await sql`
    DELETE FROM catalog_items
    WHERE id LIKE ${`${contractRunId}-%`}
      OR title = ${duplicateTitle}
  `;
}

const updateItemId = `${contractRunId}-update`;
const updateItemTitle = `Update Contract ${contractRunId}`;

try {
  await sql`
    INSERT INTO catalog_items (id, title, kind, status, note)
    VALUES (${updateItemId}, ${updateItemTitle}, ${"book"}, ${"available"}, ${"before update"})
  `;

  const updatedRows = await sql`
    UPDATE catalog_items
    SET
      status = ${"borrowed"},
      borrower_name = ${"Contract Borrower"},
      note = ${"Updated contract note"},
      updated_at = now()
    WHERE id = ${updateItemId}
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `;
  const updatedItem = rowToItem(updatedRows[0]);

  assert.equal(updatedItem.id, updateItemId, "update should keep the same id");
  assert.equal(updatedItem.title, updateItemTitle, "update should keep the same title");
  assert.equal(updatedItem.kind, "book", "update should keep the same kind");
  assert.equal(updatedItem.status, "borrowed", "update should persist status");
  assert.equal(updatedItem.borrowerName, "Contract Borrower", "update should persist borrower name");
  assert.equal(updatedItem.note, "Updated contract note", "update should persist note");

  const rowsAfterUpdate = await sql`
    SELECT id, title, kind, status, borrower_name, borrowed_date, note
    FROM catalog_items
    WHERE id = ${updateItemId}
  `;
  const searchableItems = rowsAfterUpdate.map(rowToItem);

  assert.equal(searchItems(searchableItems, "Contract Borrower").length, 1, "updated borrower should be searchable");
  assert.equal(searchItems(searchableItems, "Updated contract note").length, 1, "updated note should be searchable");

  const clearedRows = await sql`
    UPDATE catalog_items
    SET
      status = ${"available"},
      borrower_name = ${null},
      note = ${null},
      updated_at = now()
    WHERE id = ${updateItemId}
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `;
  const clearedItem = rowToItem(clearedRows[0]);

  assert.equal(clearedItem.status, "available", "update should persist available status");
  assert.equal(clearedItem.borrowerName, null, "update should allow clearing borrower name");
  assert.equal(clearedItem.note, null, "update should allow clearing note");
} finally {
  await sql`
    DELETE FROM catalog_items
    WHERE id = ${updateItemId}
      OR title = ${updateItemTitle}
  `;
}

console.log("Catalog contract check passed.");
