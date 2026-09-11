import {
  CATALOG_BORROWER_NAME_MAX_LENGTH,
  CATALOG_ITEM_KINDS,
  CATALOG_ITEM_STATUSES,
  CATALOG_NOTE_MAX_LENGTH,
  CatalogItemKind,
  CatalogItemStatus,
  CreateCatalogItemInput,
  DeleteCatalogItemInput,
  UpdateCatalogItemInput,
} from "@/lib/catalogContract";

export type CatalogItemValidationError = {
  field: "id" | "title" | "kind" | "status" | "note" | "borrowerName";
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

export type UpdateCatalogItemValidationResult =
  | {
      ok: true;
      value: UpdateCatalogItemInput;
    }
  | {
      ok: false;
      errors: CatalogItemValidationError[];
    };

export type DeleteCatalogItemValidationResult =
  | {
      ok: true;
      value: DeleteCatalogItemInput;
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

export function validateUpdateCatalogItemInput(
  input: Record<string, unknown>,
): UpdateCatalogItemValidationResult {
  const id = normalizeStringValue(input.id);
  const status = normalizeStringValue(input.status);
  const note = normalizeStringValue(input.note);
  const borrowerName = normalizeStringValue(input.borrowerName);
  const errors: CatalogItemValidationError[] = [];

  if (!id) {
    errors.push({ field: "id", message: "Item id is required." });
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

  if (borrowerName.length > CATALOG_BORROWER_NAME_MAX_LENGTH) {
    errors.push({
      field: "borrowerName",
      message: `Borrower name must be ${CATALOG_BORROWER_NAME_MAX_LENGTH} characters or fewer.`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id,
      status: status as CatalogItemStatus,
      note: note || null,
      borrowerName: borrowerName || null,
    },
  };
}

export function validateDeleteCatalogItemInput(
  input: Record<string, unknown>,
): DeleteCatalogItemValidationResult {
  const id = normalizeStringValue(input.id);

  if (!id) {
    return {
      ok: false,
      errors: [{ field: "id", message: "Item id is required." }],
    };
  }

  return {
    ok: true,
    value: { id },
  };
}
