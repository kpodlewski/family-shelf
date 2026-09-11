import { NextResponse } from "next/server";

import { deleteCatalogItem, updateCatalogItem } from "@/lib/catalog";
import {
  validateDeleteCatalogItemInput,
  validateUpdateCatalogItemInput,
} from "@/lib/catalogValidation";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { getAdminPasswordConfig } from "@/lib/profileConfig";
import { verifyProfileCapability } from "@/lib/profileAuthorization";

type UpdateCatalogItemRequest = {
  profileId?: unknown;
  sessionToken?: unknown;
  status?: unknown;
  note?: unknown;
  borrowerName?: unknown;
};

type DeleteCatalogItemRequest = {
  profileId?: unknown;
  sessionToken?: unknown;
  adminToken?: unknown;
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

export async function DELETE(
  request: Request,
  { params }: CatalogItemRouteContext,
) {
  const { id } = await params;
  let body: DeleteCatalogItemRequest;

  try {
    body = (await request.json()) as DeleteCatalogItemRequest;
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

  const configuredPassword = getAdminPasswordConfig();

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Admin password is not configured." },
      { status: 503 },
    );
  }

  if (
    typeof body.adminToken !== "string" ||
    !verifyAdminSessionToken(body.adminToken, configuredPassword)
  ) {
    return NextResponse.json(
      { error: "Admin session is invalid. Unlock admin mode again." },
      { status: 401 },
    );
  }

  const validation = validateDeleteCatalogItemInput({ id });

  if (!validation.ok) {
    return NextResponse.json(
      { error: "Catalog item delete is invalid.", errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const item = await deleteCatalogItem(validation.value);

    if (!item) {
      return NextResponse.json({ error: "Catalog item not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Could not delete the catalog item." },
      { status: 500 },
    );
  }
}
