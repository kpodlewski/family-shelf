import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ts from "typescript";

const sourcePath = new URL("../src/lib/profiles.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});

const tempDir = await mkdtemp(join(tmpdir(), "family-shelf-profiles-"));
const compiledPath = join(tempDir, "profiles.mjs");
await writeFile(compiledPath, compiled.outputText, "utf8");

const {
  PROFILE_CAPABILITIES,
  PROFILE_ROLES,
  getAppProfileById,
  listAppProfiles,
  profileCan,
} = await import(new URL(`file:///${compiledPath.replaceAll("\\", "/")}`));

const profiles = listAppProfiles();

assert.equal(profiles.length, 5, "profile list should contain four family profiles and one guest");

const ids = new Set(profiles.map((profile) => profile.id));
assert.equal(ids.size, profiles.length, "profile ids should be unique");

const supportedRoles = new Set(PROFILE_ROLES);
const supportedCapabilities = new Set(PROFILE_CAPABILITIES);

const familyProfiles = profiles.filter((profile) => profile.role === "family");
const guestProfiles = profiles.filter((profile) => profile.role === "guest");

assert.equal(familyProfiles.length, 4, "profile list should contain exactly four family profiles");
assert.equal(guestProfiles.length, 1, "profile list should contain exactly one guest profile");

for (const profile of profiles) {
  assert.ok(profile.id, "profile should have an id");
  assert.ok(profile.label, `profile ${profile.id} should have a label`);
  assert.ok(supportedRoles.has(profile.role), `${profile.id} has unsupported role`);

  for (const capability of profile.capabilities) {
    assert.ok(supportedCapabilities.has(capability), `${profile.id} has unsupported capability`);
  }

  assert.equal(profileCan(profile, "admin:delete"), false, `${profile.id} should not have admin delete capability`);
}

for (const profile of familyProfiles) {
  assert.equal(profile.requiresFamilyPassword, true, `${profile.id} should require the family password`);
  assert.equal(profileCan(profile, "catalog:read"), true, `${profile.id} should be able to read catalog items`);
  assert.equal(profileCan(profile, "catalog:search"), true, `${profile.id} should be able to search catalog items`);
  assert.equal(profileCan(profile, "catalog:write"), true, `${profile.id} should be able to write catalog items`);
}

const guest = guestProfiles[0];
assert.equal(guest.id, "guest", "guest profile should use the stable guest id");
assert.equal(guest.requiresFamilyPassword, false, "guest profile should not require the family password");
assert.equal(profileCan(guest, "catalog:read"), true, "guest should be able to read catalog items");
assert.equal(profileCan(guest, "catalog:search"), true, "guest should be able to search catalog items");
assert.equal(profileCan(guest, "catalog:write"), false, "guest should not be able to write catalog items");

assert.ok(getAppProfileById("family-1"), "getAppProfileById should find an existing family profile");
assert.ok(getAppProfileById("guest"), "getAppProfileById should find the guest profile");
assert.equal(getAppProfileById("missing-profile"), null, "getAppProfileById should return null for missing profiles");

await rm(tempDir, { force: true, recursive: true });

console.log("Profile contract check passed.");
