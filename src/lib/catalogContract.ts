export type CatalogItemStatus = "available" | "borrowed";

export type CatalogItemKind = "book" | "board-game" | "video-game";

export type CatalogItem = {
  id: string;
  title: string;
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  borrowerName?: string | null;
  borrowedDate?: string | null;
  note?: string | null;
};

export type CreateCatalogItemInput = {
  title: string;
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  note?: string | null;
  borrowerName?: string | null;
  borrowedDate?: string | null;
};

export type UpdateCatalogItemInput = {
  id: string;
  status: CatalogItemStatus;
  note?: string | null;
  borrowerName?: string | null;
};

export const CATALOG_ITEM_STATUSES = ["available", "borrowed"] as const;

export const CATALOG_ITEM_KINDS = ["book", "board-game", "video-game"] as const;

export const CATALOG_NOTE_MAX_LENGTH = 500;

export const CATALOG_BORROWER_NAME_MAX_LENGTH = 120;
