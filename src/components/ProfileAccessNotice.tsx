"use client";

import { useActiveProfile } from "@/components/ProfileGate";

export function ProfileAccessNotice() {
  const profile = useActiveProfile();

  if (!profile) {
    return null;
  }

  const canWriteCatalog = profile.capabilities.includes("catalog:write");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <span className="font-medium text-slate-900">{profile.label}</span>
      {canWriteCatalog
        ? " can add and update items in the shared catalog. Delete actions require admin unlock."
        : " can browse and search only. Add, update, and delete actions stay unavailable."}
    </div>
  );
}
