import Link from 'next/link'
import { listCatalogItems } from '@/lib/catalog'
import { formatItemKind, formatItemStatus } from '@/lib/formatItemStatus'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const items = await listCatalogItems()
  const recentItems = items.slice(0, 10)

  return (
    <main className="portal-page mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Family Shelf</p>
        <h1 className="text-3xl font-semibold">Keep your shared catalog simple</h1>
        <p className="max-w-2xl text-slate-600">
          Track what is borrowed, where it is, and who has it without relying on scattered notes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/items" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Open catalog
          </Link>
          <Link href="/admin" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Admin view
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent items</h2>
          <span className="text-sm text-slate-500">{recentItems.length} shown</span>
        </div>
        <div className="grid gap-3">
          {recentItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {formatItemKind(item.kind)}
                  </span>
                </div>
                {item.note ? <p className="text-sm text-slate-500">{item.note}</p> : null}
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {formatItemStatus(item.status)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
