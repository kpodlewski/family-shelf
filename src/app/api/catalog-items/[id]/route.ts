import { NextResponse } from "next/server";

import { updateCatalogItem } from "@/lib/catalog";
import { validateUpdateCatalogItemInput } from "@/lib/catalogValidation";
import { verifyProfileCapability } from "@/lib/profileAuthorization";

type UpdateCatalogItemRequest = {
  profileId?: unknown;
  sessionToken?: unknown;
  status?: unknown;
  note?: unknown;
  borrowerName?: unknown;
};

type CatalogItemRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: CatalogItemRouteContext,
) {
  const { id } = await params;
  let body: UpdateCatalogItemRequest;

  try {
    body = (await request.json()) as UpdateCatalogItemRequest;
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

  const validation = validateUpdateCatalogItemInput({ ...body, id });

  if (!validation.ok) {
    return NextResponse.json(
      { error: "Catalog item update is invalid.", errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const item = await updateCatalogItem(validation.value, authorization.profile);

    if (!item) {
      return NextResponse.json({ error: "Catalog item not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Could not update the catalog item." },
      { status: 500 },
    );
  }
}
