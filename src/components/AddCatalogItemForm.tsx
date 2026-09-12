"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { useActiveProfileSession } from "@/components/ProfileGate";
import {
  CATALOG_ITEM_KINDS,
  CATALOG_ITEM_STATUSES,
  CatalogItemKind,
  CatalogItemStatus,
} from "@/lib/catalogContract";
import { formatItemKind, formatItemStatus } from "@/lib/formatItemStatus";

type CatalogCreateResponse = {
  item?: {
    title: string;
  };
  error?: string;
  errors?: {
    field: string;
    message: string;
  }[];
};

export function AddCatalogItemForm() {
  const router = useRouter();
  const session = useActiveProfileSession();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CatalogItemKind>("book");
  const [status, setStatus] = useState<CatalogItemStatus>("available");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session?.profile.capabilities.includes("catalog:write")) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Add item unavailable</h2>
          <p className="text-sm text-slate-600">
            Switch to a family profile to create catalog entries.
          </p>
        </div>
      </section>
    );
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/catalog-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: session?.profile.id,
          sessionToken: session?.sessionToken,
          title,
          kind,
          status,
          note,
        }),
      });
      const payload = (await response.json()) as CatalogCreateResponse;

      if (!response.ok || !payload.item) {
        const validationMessage = payload.errors?.[0]?.message;
        setError(validationMessage ?? payload.error ?? "Could not add this item.");
        return;
      }

      setTitle("");
      setKind("book");
      setStatus("available");
      setNote("");
      router.push(`/items?q=${encodeURIComponent(payload.item.title)}`);
      router.refresh();
    } catch {
      setError("Could not reach the catalog service. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Add item</h2>
        <p className="text-sm text-slate-600">
          Create a catalog entry with the fields needed for the MVP.
        </p>
      </div>

      <form onSubmit={submitItem} className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            maxLength={160}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Kind</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as CatalogItemKind)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            >
              {CATALOG_ITEM_KINDS.map((itemKind) => (
                <option key={itemKind} value={itemKind}>
                  {formatItemKind(itemKind)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as CatalogItemStatus)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            >
              {CATALOG_ITEM_STATUSES.map((itemStatus) => (
                <option key={itemStatus} value={itemStatus}>
                  {formatItemStatus(itemStatus)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            maxLength={500}
          />
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Adding..." : "Add item"}
        </button>
      </form>
    </section>
  );
}
