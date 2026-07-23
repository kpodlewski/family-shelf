import Link from 'next/link'

const items = [
  { name: 'Dune', status: 'Borrowed', location: 'Marta' },
  { name: 'Catan', status: 'Available', location: 'Shelf A' },
  { name: 'Hades', status: 'Borrowed', location: 'Piotr' },
]

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
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
          <span className="text-sm text-slate-500">3 visible</span>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500">{item.location}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
