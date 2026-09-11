import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { neon } from "@neondatabase/serverless";

const envPath = new URL("../.env.local", import.meta.url);
const DEFAULT_BASE_URL = "http://localhost:3000";
const baseUrl = (process.env.FAMILY_SHELF_CATALOG_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  "",
);
const familyPasswordName = "FAMILY_SHELF_FAMILY_PASSWORD";
const adminPasswordName = "FAMILY_SHELF_ADMIN_PASSWORD";
const redacted = "[redacted]";
const contractRunId = `contract-api-${Date.now().toString(36)}`;

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
    "DATABASE_URL or POSTGRES_URL should be configured for catalog API checks",
  );

  return databaseUrl;
}

function requireSecret(name) {
  const value = process.env[name]?.trim();

  assert.ok(value, `${name} should be configured for catalog API checks`);

  return value;
}

function safeBody(body) {
  return JSON.stringify(
    body,
    (key, value) => {
      const loweredKey = key.toLowerCase();

      if (
        loweredKey.includes("password") ||
        loweredKey.includes("token") ||
        loweredKey.includes("secret")
      ) {
        return redacted;
      }

      return value;
    },
    2,
  );
}

async function requestJson(path, { method = "GET", body } = {}) {
  const url = `${baseUrl}${path}`;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Could not reach catalog API at ${url}. Is the local app server running at ${baseUrl}? ${error.message}`,
    );
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Keep payload null when the response body is not JSON.
  }

  return {
    response,
    payload,
    url,
    safeRequest: body === undefined ? "<empty>" : safeBody(body),
  };
}

function assertStatus(result, expectedStatus, label) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${label} expected HTTP ${expectedStatus}, got ${result.response.status} from ${result.url}. Request: ${result.safeRequest}. Response: ${JSON.stringify(result.payload)}`,
  );
}

function assertErrorPayload(result, label) {
  assert.equal(typeof result.payload?.error, "string", `${label} should return a readable error`);
  assert.ok(result.payload.error.length > 0, `${label} error should not be empty`);
}

function makeInvalidSession(session) {
  return {
    ...session,
    sessionToken: `${session.sessionToken}-invalid`,
  };
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

async function getCatalogItemById(sql, id) {
  const rows = await sql`
    SELECT id, title, kind, status, borrower_name, borrowed_date, note
    FROM catalog_items
    WHERE id = ${id}
    LIMIT 1
  `;

  return rows[0] ? rowToItem(rows[0]) : null;
}

async function assertCatalogItemById(sql, id, expectedFields, label) {
  const item = await getCatalogItemById(sql, id);

  assert.ok(item, `${label} should exist in durable catalog readback`);

  for (const [field, expectedValue] of Object.entries(expectedFields)) {
    assert.equal(
      item[field],
      expectedValue,
      `${label} durable readback should have ${field}=${JSON.stringify(expectedValue)}`,
    );
  }

  return item;
}

async function assertMissingCatalogItem(sql, id, label) {
  assert.equal(await getCatalogItemById(sql, id), null, `${label} should not exist`);
}

async function assertSeedRowsStillExist(sql) {
  const rows = await sql`
    SELECT id
    FROM catalog_items
    WHERE id IN (${"dune-book"}, ${"catan-board-game"}, ${"hades-video-game"})
  `;
  const ids = new Set(rows.map((row) => row.id));

  assert.ok(ids.has("dune-book"), "seed row dune-book should still exist");
  assert.ok(ids.has("catan-board-game"), "seed row catan-board-game should still exist");
  assert.ok(ids.has("hades-video-game"), "seed row hades-video-game should still exist");
}

async function assertItemUnchanged(sql, id, expectedFields, label) {
  await assertCatalogItemById(sql, id, expectedFields, `${label} unchanged item`);
}

async function cleanupContractRows(sql) {
  await sql`
    DELETE FROM catalog_items
    WHERE id LIKE ${`${contractRunId}-%`}
       OR title LIKE ${`%${contractRunId}%`}
  `;
}

async function getFamilySession(familyPassword, profileId = "family-1") {
  const result = await requestJson("/api/profile-session", {
    method: "POST",
    body: {
      profileId,
      password: familyPassword,
    },
  });

  assertStatus(result, 200, `${profileId} profile session`);
  assert.equal(
    result.payload?.profile?.id,
    profileId,
    `family session should return ${profileId}`,
  );
  assert.equal(
    typeof result.payload?.sessionToken,
    "string",
    "family session should return an opaque session token",
  );
  assert.ok(result.payload.sessionToken.length > 0, "family session token should not be empty");

  return {
    profileId: result.payload.profile.id,
    sessionToken: result.payload.sessionToken,
  };
}

async function getAdminSession(adminPassword) {
  const result = await requestJson("/api/admin-session", {
    method: "POST",
    body: {
      password: adminPassword,
    },
  });

  assertStatus(result, 200, "admin session");
  assert.equal(
    typeof result.payload?.adminToken,
    "string",
    "admin session should return an opaque admin token",
  );
  assert.ok(result.payload.adminToken.length > 0, "admin token should not be empty");

  return {
    adminToken: result.payload.adminToken,
  };
}

function assertCatalogPayloadItem(result, label) {
  const item = result.payload?.item;

  assert.ok(item, `${label} should return an item payload`);
  assert.equal(typeof item.id, "string", `${label} item should include an id`);
  assert.ok(item.id.length > 0, `${label} item id should not be empty`);

  return item;
}

async function createCatalogItem(input, familySession) {
  const result = await requestJson("/api/catalog-items", {
    method: "POST",
    body: {
      profileId: familySession.profileId,
      sessionToken: familySession.sessionToken,
      ...input,
    },
  });

  assertStatus(result, 201, "create catalog item");

  return assertCatalogPayloadItem(result, "create catalog item");
}

async function updateCatalogItem(itemId, input, familySession) {
  const result = await requestJson(`/api/catalog-items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: {
      profileId: familySession.profileId,
      sessionToken: familySession.sessionToken,
      ...input,
    },
  });

  assertStatus(result, 200, "update catalog item");

  return assertCatalogPayloadItem(result, "update catalog item");
}

async function deleteCatalogItem(itemId, familySession, adminSession) {
  const result = await requestJson(`/api/catalog-items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    body: {
      profileId: familySession.profileId,
      sessionToken: familySession.sessionToken,
      adminToken: adminSession.adminToken,
    },
  });

  assertStatus(result, 200, "delete catalog item");

  return assertCatalogPayloadItem(result, "delete catalog item");
}

async function expectCreateFailure(input, evidence, expectedStatus, label) {
  const result = await requestJson("/api/catalog-items", {
    method: "POST",
    body: {
      ...evidence,
      ...input,
    },
  });

  assertStatus(result, expectedStatus, label);
  assertErrorPayload(result, label);

  return result;
}

async function expectUpdateFailure(itemId, input, evidence, expectedStatus, label) {
  const result = await requestJson(`/api/catalog-items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: {
      ...evidence,
      ...input,
    },
  });

  assertStatus(result, expectedStatus, label);
  assertErrorPayload(result, label);

  return result;
}

async function expectDeleteFailure(itemId, evidence, expectedStatus, label) {
  const result = await requestJson(`/api/catalog-items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    body: evidence,
  });

  assertStatus(result, expectedStatus, label);
  assertErrorPayload(result, label);

  return result;
}

await loadLocalEnv();

const familyPassword = requireSecret(familyPasswordName);
const adminPassword = requireSecret(adminPasswordName);

try {
  const familySession = await getFamilySession(familyPassword);
  const secondFamilySession = await getFamilySession(familyPassword, "family-2");
  const adminSession = await getAdminSession(adminPassword);

  assert.equal(typeof familySession.profileId, "string", "family profile id should be present");
  assert.equal(typeof familySession.sessionToken, "string", "family session token should be present");
  assert.equal(
    typeof secondFamilySession.profileId,
    "string",
    "second family profile id should be present",
  );
  assert.equal(
    typeof secondFamilySession.sessionToken,
    "string",
    "second family session token should be present",
  );
  assert.equal(typeof adminSession.adminToken, "string", "admin token should be present");

  const sql = neon(getDatabaseUrl());

  await cleanupContractRows(sql);

  const createdTitle = `API Contract ${contractRunId}`;
  const createdNote = `Created by ${contractRunId}`;
  const createdItem = await createCatalogItem(
    {
      title: createdTitle,
      kind: "book",
      status: "available",
      note: createdNote,
    },
    familySession,
  );

  assert.equal(createdItem.title, createdTitle, "created item should keep title");
  assert.equal(createdItem.kind, "book", "created item should keep kind");
  assert.equal(createdItem.status, "available", "created item should keep status");
  assert.equal(createdItem.note, createdNote, "created item should keep note");

  await assertCatalogItemById(
    sql,
    createdItem.id,
    {
      title: createdTitle,
      kind: "book",
      status: "available",
      note: createdNote,
    },
    "created item",
  );

  const updatedItem = await updateCatalogItem(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: `Borrower ${contractRunId}`,
      note: `Updated by ${contractRunId}`,
    },
    familySession,
  );

  assert.equal(updatedItem.id, createdItem.id, "updated item should keep id");
  assert.equal(updatedItem.title, createdTitle, "updated item should keep title");
  assert.equal(updatedItem.kind, "book", "updated item should keep kind");
  assert.equal(updatedItem.status, "borrowed", "updated item should persist status");
  assert.equal(
    updatedItem.borrowerName,
    `Borrower ${contractRunId}`,
    "updated item should persist borrower",
  );
  assert.equal(updatedItem.note, `Updated by ${contractRunId}`, "updated item should persist note");

  await assertCatalogItemById(
    sql,
    createdItem.id,
    {
      title: createdTitle,
      kind: "book",
      status: "borrowed",
      borrowerName: `Borrower ${contractRunId}`,
      note: `Updated by ${contractRunId}`,
    },
    "updated item",
  );

  const clearedItem = await updateCatalogItem(
    createdItem.id,
    {
      status: "available",
      borrowerName: "",
      note: "",
    },
    familySession,
  );

  assert.equal(clearedItem.id, createdItem.id, "cleared item should keep id");
  assert.equal(clearedItem.status, "available", "cleared item should persist available status");
  assert.equal(clearedItem.borrowerName, null, "cleared item should clear borrower");
  assert.equal(clearedItem.note, null, "cleared item should clear note");

  await assertCatalogItemById(
    sql,
    createdItem.id,
    {
      title: createdTitle,
      kind: "book",
      status: "available",
      borrowerName: null,
      note: null,
    },
    "cleared item",
  );

  const cleanExpectedFields = {
    title: createdTitle,
    kind: "book",
    status: "available",
    borrowerName: null,
    note: null,
  };
  const familyEvidence = {
    profileId: familySession.profileId,
    sessionToken: familySession.sessionToken,
  };
  const guestEvidence = {
    profileId: "guest",
    sessionToken: null,
  };
  const invalidFamilyEvidence = makeInvalidSession(familySession);
  const mismatchedFamilyEvidence = {
    profileId: secondFamilySession.profileId,
    sessionToken: familySession.sessionToken,
  };

  await expectCreateFailure(
    {
      title: `Missing Profile ${contractRunId}`,
      kind: "book",
      status: "available",
      note: "should fail",
    },
    {},
    400,
    "create without profile evidence",
  );
  await expectCreateFailure(
    {
      title: `Guest Create ${contractRunId}`,
      kind: "book",
      status: "available",
      note: "should fail",
    },
    guestEvidence,
    403,
    "guest create",
  );
  await expectCreateFailure(
    {
      title: `Invalid Session Create ${contractRunId}`,
      kind: "book",
      status: "available",
      note: "should fail",
    },
    invalidFamilyEvidence,
    401,
    "invalid family session create",
  );
  await expectCreateFailure(
    {
      title: `Mismatched Family Create ${contractRunId}`,
      kind: "book",
      status: "available",
      note: "should fail",
    },
    mismatchedFamilyEvidence,
    401,
    "mismatched family session create",
  );
  await expectCreateFailure(
    {
      title: "   ",
      kind: "book",
      status: "available",
      note: "should fail",
    },
    familyEvidence,
    400,
    "blank title create",
  );
  await assertMissingCatalogItem(sql, `${contractRunId}-missing-create`, "failed create");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: "Missing Profile",
      note: "should fail",
    },
    {},
    400,
    "update without profile evidence",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "missing profile update");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: "Guest",
      note: "should fail",
    },
    guestEvidence,
    403,
    "guest update",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "guest update");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: "Invalid Session",
      note: "should fail",
    },
    invalidFamilyEvidence,
    401,
    "invalid family session update",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "invalid session update");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: "Mismatched Family",
      note: "should fail",
    },
    mismatchedFamilyEvidence,
    401,
    "mismatched family session update",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "mismatched session update");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "lost",
      borrowerName: "Invalid Status",
      note: "should fail",
    },
    familyEvidence,
    400,
    "invalid status update",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "invalid status update");

  await expectUpdateFailure(
    createdItem.id,
    {
      status: "borrowed",
      borrowerName: "x".repeat(121),
      note: "should fail",
    },
    familyEvidence,
    400,
    "overlong borrower update",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "overlong borrower update");

  await expectDeleteFailure(createdItem.id, {}, 400, "delete without profile evidence");
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "missing profile delete");

  await expectDeleteFailure(
    createdItem.id,
    guestEvidence,
    403,
    "guest delete",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "guest delete");

  await expectDeleteFailure(
    createdItem.id,
    invalidFamilyEvidence,
    401,
    "invalid family session delete",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "invalid session delete");

  await expectDeleteFailure(
    createdItem.id,
    {
      ...mismatchedFamilyEvidence,
      adminToken: adminSession.adminToken,
    },
    401,
    "mismatched family session delete",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "mismatched session delete");

  await expectDeleteFailure(
    createdItem.id,
    familyEvidence,
    401,
    "delete without admin token",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "missing admin token delete");

  await expectDeleteFailure(
    createdItem.id,
    {
      ...familyEvidence,
      adminToken: `${adminSession.adminToken}-invalid`,
    },
    401,
    "delete with invalid admin token",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "invalid admin token delete");

  await expectDeleteFailure(
    `${contractRunId}-missing-delete`,
    {
      ...familyEvidence,
      adminToken: adminSession.adminToken,
    },
    404,
    "delete missing item",
  );
  await assertItemUnchanged(sql, createdItem.id, cleanExpectedFields, "missing item delete");

  const deletedItem = await deleteCatalogItem(createdItem.id, familySession, adminSession);

  assert.equal(deletedItem.id, createdItem.id, "deleted item should return deleted id");
  assert.equal(deletedItem.title, createdTitle, "deleted item should return deleted title");

  await assertMissingCatalogItem(sql, createdItem.id, "deleted item");
  await assertSeedRowsStillExist(sql);

  await cleanupContractRows(sql);
} finally {
  // The script keeps cleanup explicit and local to contract-owned rows.
}

console.log(`Catalog API contract check passed against ${baseUrl}.`);
