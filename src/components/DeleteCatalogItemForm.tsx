"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useActiveProfileSession } from "@/components/ProfileGate";
import type { CatalogItem } from "@/lib/catalogContract";
import { ADMIN_SESSION_STORAGE_KEY } from "@/lib/adminSessionStorage";

type AdminSessionResponse = {
  adminToken?: string;
};

type CatalogDeleteResponse = {
  item?: CatalogItem;
  error?: string;
  errors?: {
    field: string;
    message: string;
  }[];
};

type DeleteCatalogItemFormProps = {
  item: CatalogItem;
};

export function DeleteCatalogItemForm({ item }: DeleteCatalogItemFormProps) {
  const router = useRouter();
  const session = useActiveProfileSession();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedToken = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

      if (!storedToken) {
        setIsHydrated(true);
        return;
      }

      async function verifyStoredToken() {
        try {
          const response = await fetch("/api/admin-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ adminToken: storedToken }),
          });
          const payload = (await response.json()) as AdminSessionResponse;

          if (response.ok && payload.adminToken) {
            setAdminToken(payload.adminToken);
            window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, payload.adminToken);
          } else {
            window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          }
        } catch {
          window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        } finally {
          setIsHydrated(true);
        }
      }

      void verifyStoredToken();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (
    !isHydrated ||
    !adminToken ||
    !session?.profile.capabilities.includes("catalog:write")
  ) {
    return null;
  }

  async function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const confirmed = window.confirm(`Delete "${item.title}" from the catalog?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/catalog-items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: session?.profile.id,
          sessionToken: session?.sessionToken,
          adminToken,
        }),
      });
      const payload = (await response.json()) as CatalogDeleteResponse;

      if (!response.ok || !payload.item) {
        const validationMessage = payload.errors?.[0]?.message;
        setError(validationMessage ?? payload.error ?? "Could not delete this item.");
        return;
      }

      router.push("/items");
      router.refresh();
    } catch {
      setError("Could not reach the catalog service. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      onSubmit={submitDelete}
      className="mt-3 flex flex-wrap items-center gap-3 border-t border-red-100 pt-3"
    >
      <button
        type="submit"
        disabled={isDeleting}
        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:border-red-200 disabled:text-red-300"
      >
        {isDeleting ? "Deleting..." : "Delete item"}
      </button>
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </form>
  );
}
