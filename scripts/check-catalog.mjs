import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ts from "typescript";

const sourcePath = new URL("../src/lib/catalog.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});

const tempDir = await mkdtemp(join(tmpdir(), "family-shelf-catalog-"));
const compiledPath = join(tempDir, "catalog.mjs");
await writeFile(compiledPath, compiled.outputText, "utf8");

const {
  CATALOG_ITEM_KINDS,
  CATALOG_ITEM_STATUSES,
  getCatalogItemById,
  listCatalogItems,
  searchCatalogItems,
} = await import(new URL(`file:///${compiledPath.replaceAll("\\", "/")}`));

const items = listCatalogItems();

assert.equal(items.length, 3, "seed catalog should contain the expected item count");

const ids = new Set(items.map((item) => item.id));
assert.equal(ids.size, items.length, "catalog item ids should be unique");

const supportedStatuses = new Set(CATALOG_ITEM_STATUSES);
const supportedKinds = new Set(CATALOG_ITEM_KINDS);

for (const item of items) {
  assert.ok(item.id, "catalog item should have an id");
  assert.ok(item.title, `catalog item ${item.id} should have a title`);
  assert.ok(supportedStatuses.has(item.status), `${item.id} has unsupported status`);
  assert.ok(supportedKinds.has(item.kind), `${item.id} has unsupported kind`);
}

assert.ok(getCatalogItemById("dune-book"), "getCatalogItemById should find an existing item");
assert.equal(getCatalogItemById("missing-item"), null, "getCatalogItemById should return null for missing items");

assert.equal(searchCatalogItems("dune").length, 1, "search should find an item by title");
assert.equal(searchCatalogItems("DUNE").length, 1, "search should find an item by title case-insensitively");
assert.equal(searchCatalogItems("Marta").length, 1, "search should find an item by borrower");
assert.equal(searchCatalogItems("Shelf A").length, 1, "search should find an item by note");
assert.equal(searchCatalogItems("gra planszowa").length, 1, "search should find an item by kind label");
assert.equal(searchCatalogItems("").length, items.length, "empty search should return all items");
assert.equal(searchCatalogItems("   ").length, items.length, "whitespace search should return all items");
assert.equal(searchCatalogItems("not-in-this-catalog").length, 0, "unmatched search should return no items");

await rm(tempDir, { force: true, recursive: true });

console.log("Catalog contract check passed.");
