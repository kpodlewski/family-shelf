import { getFamilyPasswordConfig } from "@/lib/profileConfig";
import {
  AppProfile,
  ProfileCapability,
  getAppProfileById,
  profileCan,
} from "@/lib/profiles";
import { verifyProfileSessionToken } from "@/lib/profileSession";

export type ProfileEvidence = {
  profileId?: unknown;
  sessionToken?: unknown;
};

export type ProfileAuthorizationResult =
  | {
      ok: true;
      profile: AppProfile;
    }
  | {
      ok: false;
      status: 400 | 401 | 403 | 404 | 503;
      message: string;
    };

export function verifyProfileCapability(
  evidence: ProfileEvidence,
  capability: ProfileCapability,
): ProfileAuthorizationResult {
  if (typeof evidence.profileId !== "string") {
    return { ok: false, status: 400, message: "Choose a profile." };
  }

  const profile = getAppProfileById(evidence.profileId);

  if (!profile) {
    return { ok: false, status: 404, message: "Profile not found." };
  }

  if (!profileCan(profile, capability)) {
    return { ok: false, status: 403, message: "This profile is read-only." };
  }

  if (!profile.requiresFamilyPassword) {
    return { ok: true, profile };
  }

  const configuredPassword = getFamilyPasswordConfig();

  if (!configuredPassword) {
    return {
      ok: false,
      status: 503,
      message: "Family password is not configured.",
    };
  }

  if (
    typeof evidence.sessionToken !== "string" ||
    !verifyProfileSessionToken(evidence.sessionToken, profile, configuredPassword)
  ) {
    return {
      ok: false,
      status: 401,
      message: "Profile session is invalid. Choose the profile again.",
    };
  }

  return { ok: true, profile };
}
