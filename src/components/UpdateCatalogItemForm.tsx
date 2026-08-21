"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { useActiveProfileSession } from "@/components/ProfileGate";
import { CATALOG_ITEM_STATUSES } from "@/lib/catalog";
import type { CatalogItem, CatalogItemStatus } from "@/lib/catalog";
import {
  CATALOG_BORROWER_NAME_MAX_LENGTH,
  CATALOG_NOTE_MAX_LENGTH,
} from "@/lib/catalogValidation";
import { formatItemStatus } from "@/lib/formatItemStatus";

type CatalogUpdateResponse = {
  item?: CatalogItem;
  error?: string;
  errors?: {
    field: string;
    message: string;
  }[];
};

type UpdateCatalogItemFormProps = {
  item: CatalogItem;
};

export function UpdateCatalogItemForm({ item }: UpdateCatalogItemFormProps) {
  const router = useRouter();
  const session = useActiveProfileSession();
  const [status, setStatus] = useState<CatalogItemStatus>(item.status);
  const [borrowerName, setBorrowerName] = useState(item.borrowerName ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session?.profile.capabilities.includes("catalog:write")) {
    return null;
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/catalog-items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: session?.profile.id,
          sessionToken: session?.sessionToken,
          status,
          borrowerName,
          note,
        }),
      });
      const payload = (await response.json()) as CatalogUpdateResponse;

      if (!response.ok || !payload.item) {
        const validationMessage = payload.errors?.[0]?.message;
        setError(validationMessage ?? payload.error ?? "Could not update this item.");
        return;
      }

      setStatus(payload.item.status);
      setBorrowerName(payload.item.borrowerName ?? "");
      setNote(payload.item.note ?? "");
      setMessage("Saved");
      router.refresh();
    } catch {
      setError("Could not reach the catalog service. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitUpdate}
      className="mt-3 grid gap-3 border-t border-slate-100 pt-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-slate-600">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CatalogItemStatus)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
          >
            {CATALOG_ITEM_STATUSES.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {formatItemStatus(itemStatus)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-slate-600">Borrower</span>
          <input
            type="text"
            value={borrowerName}
            onChange={(event) => setBorrowerName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            maxLength={CATALOG_BORROWER_NAME_MAX_LENGTH}
          />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-slate-600">Note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-20 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
          maxLength={CATALOG_NOTE_MAX_LENGTH}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Saving..." : "Save state"}
        </button>
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
