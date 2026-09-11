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

async function cleanupContractRows(sql) {
  await sql`
    DELETE FROM catalog_items
    WHERE id LIKE ${`${contractRunId}-%`}
       OR title LIKE ${`%${contractRunId}%`}
  `;
}

async function getFamilySession(familyPassword) {
  const result = await requestJson("/api/profile-session", {
    method: "POST",
    body: {
      profileId: "family-1",
      password: familyPassword,
    },
  });

  assertStatus(result, 200, "family profile session");
  assert.equal(result.payload?.profile?.id, "family-1", "family session should return family-1");
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

await loadLocalEnv();

const familyPassword = requireSecret(familyPasswordName);
const adminPassword = requireSecret(adminPasswordName);

try {
  const familySession = await getFamilySession(familyPassword);
  const adminSession = await getAdminSession(adminPassword);

  assert.equal(typeof familySession.profileId, "string", "family profile id should be present");
  assert.equal(typeof familySession.sessionToken, "string", "family session token should be present");
  assert.equal(typeof adminSession.adminToken, "string", "admin token should be present");

  const sql = neon(getDatabaseUrl());

  await cleanupContractRows(sql);

  // Phase 2 adds mutation assertions here; Phase 1 proves the reusable API harness.
  assert.equal(
    await getCatalogItemById(sql, `${contractRunId}-missing`),
    null,
    "DB readback helper should return null for a missing contract row",
  );

  await cleanupContractRows(sql);
} finally {
  // Phase 2 wraps mutation-specific cleanup here once contract rows are created.
}

console.log(`Catalog API contract harness passed against ${baseUrl}.`);
