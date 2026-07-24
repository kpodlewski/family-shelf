import { listCatalogItems } from '@/lib/catalog'
import { formatItemKind, formatItemStatus } from '@/lib/formatItemStatus'

export default function ItemsPage() {
  const items = listCatalogItems()

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Item catalog</h1>
      <p className="text-slate-600">Search, add, and update items for the family inventory.</p>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Items</h2>
          <span className="text-sm text-slate-500">{items.length} visible</span>
        </div>

        <div className="grid gap-3">
          {items.map((item) => (
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
