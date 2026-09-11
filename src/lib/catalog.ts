import { randomUUID } from "node:crypto";

import {
  CatalogItem,
  CatalogItemKind,
  CatalogItemStatus,
  CreateCatalogItemInput,
  DeleteCatalogItemInput,
  UpdateCatalogItemInput,
} from "@/lib/catalogContract";
import { getSqlClient } from "@/lib/database";
import { AppProfile, profileCan } from "@/lib/profiles";

const catalogItemKindSearchLabels: Record<CatalogItemKind, string> = {
  book: "book ksiazka",
  "board-game": "board game gra planszowa",
  "video-game": "video game gra komputerowa gra pc",
};

export const CATALOG_SEED_ITEMS: readonly CatalogItem[] = [
  {
    id: "dune-book",
    title: "Dune",
    kind: "book",
    status: "borrowed",
    borrowerName: "Marta",
    borrowedDate: null,
    note: "Borrowed by Marta",
  },
  {
    id: "catan-board-game",
    title: "Catan",
    kind: "board-game",
    status: "available",
    borrowerName: null,
    borrowedDate: null,
    note: "Shelf A",
  },
  {
    id: "hades-video-game",
    title: "Hades",
    kind: "video-game",
    status: "borrowed",
    borrowerName: "Piotr",
    borrowedDate: null,
    note: "Borrowed by Piotr",
  },
];

type CatalogItemRow = {
  id: string;
  title: string;
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  borrower_name: string | null;
  borrowed_date: string | null;
  note: string | null;
};

function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function getSearchText(item: CatalogItem): string {
  return [
    item.title,
    catalogItemKindSearchLabels[item.kind],
    item.borrowerName,
    item.borrowedDate,
    item.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function rowToCatalogItem(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    borrowerName: row.borrower_name,
    borrowedDate: row.borrowed_date,
    note: row.note,
  };
}

function slugifyTitle(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "catalog-item"
  );
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT id, title, kind, status, borrower_name, borrowed_date, note
    FROM catalog_items
    ORDER BY created_at ASC, title ASC
  `) as CatalogItemRow[];

  return rows.map(rowToCatalogItem);
}

export async function getCatalogItemById(id: string): Promise<CatalogItem | null> {
  const sql = getSqlClient();
  const rows = (await sql`
    SELECT id, title, kind, status, borrower_name, borrowed_date, note
    FROM catalog_items
    WHERE id = ${id}
    LIMIT 1
  `) as CatalogItemRow[];

  return rows[0] ? rowToCatalogItem(rows[0]) : null;
}

export async function searchCatalogItems(query: string): Promise<CatalogItem[]> {
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return listCatalogItems();
  }

  const items = await listCatalogItems();

  return items.filter((item) => getSearchText(item).includes(normalizedQuery));
}

export async function createCatalogItem(
  input: CreateCatalogItemInput,
  actorProfile: AppProfile,
): Promise<CatalogItem> {
  if (!profileCan(actorProfile, "catalog:write")) {
    throw new Error("Profile cannot create catalog items.");
  }

  const sql = getSqlClient();
  const title = input.title.trim();
  const note = input.note?.trim() || null;
  const id = `${slugifyTitle(title)}-${randomUUID().slice(0, 8)}`;
  const rows = (await sql`
    INSERT INTO catalog_items (
      id,
      title,
      kind,
      status,
      borrower_name,
      borrowed_date,
      note
    )
    VALUES (
      ${id},
      ${title},
      ${input.kind},
      ${input.status},
      ${input.borrowerName ?? null},
      ${input.borrowedDate ?? null},
      ${note}
    )
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `) as CatalogItemRow[];

  return rowToCatalogItem(rows[0]);
}

export async function updateCatalogItem(
  input: UpdateCatalogItemInput,
  actorProfile: AppProfile,
): Promise<CatalogItem | null> {
  if (!profileCan(actorProfile, "catalog:write")) {
    throw new Error("Profile cannot update catalog items.");
  }

  const sql = getSqlClient();
  const note = input.note?.trim() || null;
  const borrowerName = input.borrowerName?.trim() || null;
  const rows = (await sql`
    UPDATE catalog_items
    SET
      status = ${input.status},
      borrower_name = ${borrowerName},
      note = ${note},
      updated_at = now()
    WHERE id = ${input.id}
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `) as CatalogItemRow[];

  return rows[0] ? rowToCatalogItem(rows[0]) : null;
}

export async function deleteCatalogItem(
  input: DeleteCatalogItemInput,
): Promise<CatalogItem | null> {
  const sql = getSqlClient();
  const rows = (await sql`
    DELETE FROM catalog_items
    WHERE id = ${input.id}
    RETURNING id, title, kind, status, borrower_name, borrowed_date, note
  `) as CatalogItemRow[];

  return rows[0] ? rowToCatalogItem(rows[0]) : null;
}
