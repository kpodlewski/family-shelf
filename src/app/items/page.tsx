import { formatItemStatus } from '@/lib/formatItemStatus'

const items = [
  { name: 'Dune', status: 'Borrowed', location: 'Marta' },
  { name: 'Catan', status: 'Available', location: 'Shelf A' },
  { name: 'Hades', status: 'Borrowed', location: 'Piotr' },
]

export default function ItemsPage() {
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
            <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500">{item.location}</p>
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
