import { NextResponse } from "next/server";

import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/adminSession";
import { getAdminPasswordConfig } from "@/lib/profileConfig";

type AdminSessionRequest = {
  password?: unknown;
  adminToken?: unknown;
};

export async function POST(request: Request) {
  let body: AdminSessionRequest;

  try {
    body = (await request.json()) as AdminSessionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const configuredPassword = getAdminPasswordConfig();

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Admin password is not configured." },
      { status: 503 },
    );
  }

  if (
    typeof body.adminToken === "string" &&
    verifyAdminSessionToken(body.adminToken, configuredPassword)
  ) {
    return NextResponse.json({ adminToken: body.adminToken });
  }

  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter the admin password." }, { status: 400 });
  }

  if (body.password !== configuredPassword) {
    return NextResponse.json(
      { error: "The admin password is incorrect." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    adminToken: createAdminSessionToken(configuredPassword),
  });
}
