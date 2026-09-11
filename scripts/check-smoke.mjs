import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const envPath = new URL("../.env.local", import.meta.url);
const DEFAULT_BASE_URL = "https://family-shelf-gamma.vercel.app";
const baseUrl = (process.env.FAMILY_SHELF_SMOKE_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
const familyPasswordName = "FAMILY_SHELF_FAMILY_PASSWORD";
const adminPasswordName = "FAMILY_SHELF_ADMIN_PASSWORD";
const seedTitles = ["Dune", "Catan", "Hades"];
const redacted = "[redacted]";

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

function requireSecret(name) {
  const value = process.env[name]?.trim();

  assert.ok(value, `${name} should be configured for smoke checks`);

  return value;
}

function safeBody(body) {
  return JSON.stringify(
    body,
    (key, value) => (key.toLowerCase().includes("password") ? redacted : value),
    2,
  );
}

async function postJson(path, body) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Keep payload null when the response body is not JSON.
  }

  return { response, payload, url, safeRequest: safeBody(body) };
}

async function getText(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url);
  const text = await response.text();

  return { response, text, url };
}

function assertStatus(result, expectedStatus, label) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `${label} expected HTTP ${expectedStatus}, got ${result.response.status} from ${result.url}. Request: ${result.safeRequest}. Response: ${JSON.stringify(result.payload)}`,
  );
}

function makeWrongPassword(password) {
  return `${password}-wrong-smoke`;
}

await loadLocalEnv();

const familyPassword = requireSecret(familyPasswordName);
const adminPassword = requireSecret(adminPasswordName);

const familySuccess = await postJson("/api/profile-session", {
  profileId: "family-1",
  password: familyPassword,
});
assertStatus(familySuccess, 200, "family profile login");
assert.equal(familySuccess.payload?.profile?.id, "family-1", "family profile login should return family-1");
assert.equal(typeof familySuccess.payload?.sessionToken, "string", "family profile login should return a session token");
assert.ok(familySuccess.payload.sessionToken.length > 0, "family profile session token should not be empty");

const familyWrongPassword = await postJson("/api/profile-session", {
  profileId: "family-1",
  password: makeWrongPassword(familyPassword),
});
assertStatus(familyWrongPassword, 401, "family wrong password");

const adminSuccess = await postJson("/api/admin-session", {
  password: adminPassword,
});
assertStatus(adminSuccess, 200, "admin unlock");
assert.equal(typeof adminSuccess.payload?.adminToken, "string", "admin unlock should return an admin token");
assert.ok(adminSuccess.payload.adminToken.length > 0, "admin token should not be empty");

const adminWrongPassword = await postJson("/api/admin-session", {
  password: makeWrongPassword(adminPassword),
});
assertStatus(adminWrongPassword, 401, "admin wrong password");

const itemsPage = await getText("/items");
assert.equal(
  itemsPage.response.status,
  200,
  `/items expected HTTP 200, got ${itemsPage.response.status} from ${itemsPage.url}`,
);
assert.ok(
  itemsPage.text.includes("Item catalog"),
  `/items should render the catalog shell at ${itemsPage.url}`,
);

const foundSeedTitle = seedTitles.find((title) => itemsPage.text.includes(title));
assert.ok(
  foundSeedTitle,
  `/items should render at least one known seed title (${seedTitles.join(", ")}). Run npm.cmd run check:catalog before smoke to ensure seed rows exist.`,
);

console.log(`Smoke check passed for session endpoints and /items at ${baseUrl}.`);
