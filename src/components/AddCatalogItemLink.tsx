"use client";

import Link from "next/link";

import { useActiveProfileSession } from "@/components/ProfileGate";

export function AddCatalogItemLink() {
  const session = useActiveProfileSession();

  if (!session?.profile.capabilities.includes("catalog:write")) {
    return null;
  }

  return (
    <Link
      href="/items/new"
      className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
    >
      Add item
    </Link>
  );
}
