import { NextResponse } from "next/server";

import { createCatalogItem } from "@/lib/catalog";
import { validateCreateCatalogItemInput } from "@/lib/catalogValidation";
import { verifyProfileCapability } from "@/lib/profileAuthorization";

type CreateCatalogItemRequest = {
  profileId?: unknown;
  sessionToken?: unknown;
  title?: unknown;
  kind?: unknown;
  status?: unknown;
  note?: unknown;
};

export async function POST(request: Request) {
  let body: CreateCatalogItemRequest;

  try {
    body = (await request.json()) as CreateCatalogItemRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const authorization = verifyProfileCapability(body, "catalog:write");

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const validation = validateCreateCatalogItemInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      { error: "Catalog item is invalid.", errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const item = await createCatalogItem(validation.value, authorization.profile);

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not create the catalog item." },
      { status: 500 },
    );
  }
}
