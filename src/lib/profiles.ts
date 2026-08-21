export type ProfileRole = "family" | "guest";

export type ProfileCapability =
  | "catalog:read"
  | "catalog:search"
  | "catalog:write"
  | "admin:delete";

export type AppProfile = {
  id: string;
  label: string;
  role: ProfileRole;
  requiresFamilyPassword: boolean;
  capabilities: readonly ProfileCapability[];
};

export const PROFILE_ROLES = ["family", "guest"] as const;

export const PROFILE_CAPABILITIES = [
  "catalog:read",
  "catalog:search",
  "catalog:write",
  "admin:delete",
] as const;

const familyCapabilities = [
  "catalog:read",
  "catalog:search",
  "catalog:write",
] as const satisfies readonly ProfileCapability[];

const guestCapabilities = [
  "catalog:read",
  "catalog:search",
] as const satisfies readonly ProfileCapability[];

const appProfiles: readonly AppProfile[] = [
  {
    id: "family-1",
    label: "Family profile 1",
    role: "family",
    requiresFamilyPassword: true,
    capabilities: familyCapabilities,
  },
  {
    id: "family-2",
    label: "Family profile 2",
    role: "family",
    requiresFamilyPassword: true,
    capabilities: familyCapabilities,
  },
  {
    id: "family-3",
    label: "Family profile 3",
    role: "family",
    requiresFamilyPassword: true,
    capabilities: familyCapabilities,
  },
  {
    id: "family-4",
    label: "Family profile 4",
    role: "family",
    requiresFamilyPassword: true,
    capabilities: familyCapabilities,
  },
  {
    id: "guest",
    label: "Guest",
    role: "guest",
    requiresFamilyPassword: false,
    capabilities: guestCapabilities,
  },
];

function copyProfile(profile: AppProfile): AppProfile {
  return {
    ...profile,
    capabilities: [...profile.capabilities],
  };
}

export function listAppProfiles(): AppProfile[] {
  return appProfiles.map(copyProfile);
}

export function getAppProfileById(id: string): AppProfile | null {
  const profile = appProfiles.find((appProfile) => appProfile.id === id);

  return profile ? copyProfile(profile) : null;
}

export function profileCan(
  profile: AppProfile,
  capability: ProfileCapability,
): boolean {
  return profile.capabilities.includes(capability);
}
