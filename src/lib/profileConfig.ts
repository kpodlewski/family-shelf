export const FAMILY_PASSWORD_ENV_VAR = "FAMILY_SHELF_FAMILY_PASSWORD";
export const ADMIN_PASSWORD_ENV_VAR = "FAMILY_SHELF_ADMIN_PASSWORD";

export function getFamilyPasswordConfig(): string | null {
  return process.env[FAMILY_PASSWORD_ENV_VAR]?.trim() || null;
}

export function hasConfiguredFamilyPassword(): boolean {
  return getFamilyPasswordConfig() !== null;
}

export function getAdminPasswordConfig(): string | null {
  return process.env[ADMIN_PASSWORD_ENV_VAR]?.trim() || null;
}

export function hasConfiguredAdminPassword(): boolean {
  return getAdminPasswordConfig() !== null;
}
