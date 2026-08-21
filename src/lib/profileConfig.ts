export const FAMILY_PASSWORD_ENV_VAR = "FAMILY_SHELF_FAMILY_PASSWORD";

export function getFamilyPasswordConfig(): string | null {
  return process.env[FAMILY_PASSWORD_ENV_VAR]?.trim() || null;
}

export function hasConfiguredFamilyPassword(): boolean {
  return getFamilyPasswordConfig() !== null;
}
