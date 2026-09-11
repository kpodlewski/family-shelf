import { AdminUnlockPanel } from "@/components/AdminUnlockPanel";

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="text-slate-600">
        Unlock protected catalog actions before using admin-only controls.
      </p>
      <AdminUnlockPanel />
    </main>
  );
}
