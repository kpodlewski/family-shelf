import {
  CATALOG_ITEM_KINDS,
  CATALOG_ITEM_STATUSES,
  CatalogItemKind,
  CatalogItemStatus,
  CreateCatalogItemInput,
} from "@/lib/catalog";

export const CATALOG_NOTE_MAX_LENGTH = 500;

export type CatalogItemValidationError = {
  field: "title" | "kind" | "status" | "note";
  message: string;
};

export type CatalogItemValidationResult =
  | {
      ok: true;
      value: CreateCatalogItemInput;
    }
  | {
      ok: false;
      errors: CatalogItemValidationError[];
    };

function normalizeStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isCatalogItemKind(value: string): value is CatalogItemKind {
  return CATALOG_ITEM_KINDS.includes(value as CatalogItemKind);
}

function isCatalogItemStatus(value: string): value is CatalogItemStatus {
  return CATALOG_ITEM_STATUSES.includes(value as CatalogItemStatus);
}

export function validateCreateCatalogItemInput(
  input: Record<string, unknown>,
): CatalogItemValidationResult {
  const title = normalizeStringValue(input.title);
  const kind = normalizeStringValue(input.kind);
  const status = normalizeStringValue(input.status);
  const note = normalizeStringValue(input.note);
  const errors: CatalogItemValidationError[] = [];

  if (!title) {
    errors.push({ field: "title", message: "Title is required." });
  }

  if (!isCatalogItemKind(kind)) {
    errors.push({ field: "kind", message: "Choose a supported item type." });
  }

  if (!isCatalogItemStatus(status)) {
    errors.push({ field: "status", message: "Choose a supported status." });
  }

  if (note.length > CATALOG_NOTE_MAX_LENGTH) {
    errors.push({
      field: "note",
      message: `Note must be ${CATALOG_NOTE_MAX_LENGTH} characters or fewer.`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const validatedKind = kind as CatalogItemKind;
  const validatedStatus = status as CatalogItemStatus;

  return {
    ok: true,
    value: {
      title,
      kind: validatedKind,
      status: validatedStatus,
      note: note || null,
    },
  };
}
