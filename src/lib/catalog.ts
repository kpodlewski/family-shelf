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

export const CATALOG_ITEM_STATUSES = ["available", "borrowed"] as const;

export const CATALOG_ITEM_KINDS = ["book", "board-game", "video-game"] as const;

const catalogItemKindSearchLabels: Record<CatalogItemKind, string> = {
  book: "book ksiazka",
  "board-game": "board game gra planszowa",
  "video-game": "video game gra komputerowa gra pc",
};

const catalogItems: readonly CatalogItem[] = [
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

function copyCatalogItem(item: CatalogItem): CatalogItem {
  return { ...item };
}

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

export function listCatalogItems(): CatalogItem[] {
  return catalogItems.map(copyCatalogItem);
}

export function getCatalogItemById(id: string): CatalogItem | null {
  const item = catalogItems.find((catalogItem) => catalogItem.id === id);

  return item ? copyCatalogItem(item) : null;
}

export function searchCatalogItems(query: string): CatalogItem[] {
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return listCatalogItems();
  }

  return catalogItems
    .filter((item) => getSearchText(item).includes(normalizedQuery))
    .map(copyCatalogItem);
}
