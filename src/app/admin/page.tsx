export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Admin</h1>
      <p className="text-slate-600">Protected destructive actions will live in a later MVP slice.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Profile selection does not unlock delete actions or admin password behavior.
        </p>
      </div>
    </main>
  )
}
