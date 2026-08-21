import { NextResponse } from "next/server";

import { getFamilyPasswordConfig } from "@/lib/profileConfig";
import { getAppProfileById } from "@/lib/profiles";
import {
  createProfileSessionToken,
  verifyProfileSessionToken,
} from "@/lib/profileSession";

type ProfileSessionRequest = {
  profileId?: unknown;
  password?: unknown;
  sessionToken?: unknown;
};

export async function POST(request: Request) {
  let body: ProfileSessionRequest;

  try {
    body = (await request.json()) as ProfileSessionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.profileId !== "string") {
    return NextResponse.json({ error: "Choose a profile." }, { status: 400 });
  }

  const profile = getAppProfileById(body.profileId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (profile.requiresFamilyPassword) {
    const configuredPassword = getFamilyPasswordConfig();

    if (!configuredPassword) {
      return NextResponse.json(
        { error: "Family password is not configured." },
        { status: 503 },
      );
    }

    if (
      typeof body.sessionToken === "string" &&
      verifyProfileSessionToken(body.sessionToken, profile, configuredPassword)
    ) {
      return NextResponse.json({
        profile: {
          id: profile.id,
          label: profile.label,
          role: profile.role,
          capabilities: profile.capabilities,
        },
        sessionToken: body.sessionToken,
      });
    }

    if (typeof body.password !== "string" || body.password !== configuredPassword) {
      return NextResponse.json(
        { error: "The family password is incorrect." },
        { status: 401 },
      );
    }
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      label: profile.label,
      role: profile.role,
      capabilities: profile.capabilities,
    },
    sessionToken: profile.requiresFamilyPassword
      ? createProfileSessionToken(profile, getFamilyPasswordConfig() ?? "")
      : null,
  });
}
