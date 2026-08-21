import { createHmac, timingSafeEqual } from "node:crypto";

import { AppProfile } from "@/lib/profiles";

type ProfileSessionPayload = {
  profileId: string;
  issuedAt: number;
  version: 1;
};

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createProfileSessionToken(profile: AppProfile, secret: string): string {
  const payload: ProfileSessionPayload = {
    profileId: profile.id,
    issuedAt: Date.now(),
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyProfileSessionToken(
  token: string,
  profile: AppProfile,
  secret: string,
): boolean {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<ProfileSessionPayload>;

    return payload.version === 1 && payload.profileId === profile.id;
  } catch {
    return false;
  }
}
