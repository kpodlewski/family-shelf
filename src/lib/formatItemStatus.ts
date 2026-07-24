import type { CatalogItemKind, CatalogItemStatus } from "@/lib/catalog";

export function formatItemStatus(status: CatalogItemStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "borrowed":
      return "Borrowed";
  }
}

export function formatItemKind(kind: CatalogItemKind): string {
  switch (kind) {
    case "book":
      return "Book";
    case "board-game":
      return "Board game";
    case "video-game":
      return "Video game";
  }
}
