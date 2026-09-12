import Link from "next/link";

import { AddCatalogItemForm } from "@/components/AddCatalogItemForm";
import { ProfileAccessNotice } from "@/components/ProfileAccessNotice";

export default function NewCatalogItemPage() {
  return (
    <main className="portal-page mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold">Add item</h1>
          <p className="text-slate-600">Create a new entry in the shared family catalog.</p>
        </div>
        <Link
          href="/items"
          className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Back to catalog
        </Link>
      </header>

      <ProfileAccessNotice />
      <AddCatalogItemForm />
    </main>
  );
}
