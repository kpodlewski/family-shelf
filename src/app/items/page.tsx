import Link from 'next/link'
import { listCatalogItems, searchCatalogItems } from '@/lib/catalog'
import { formatItemKind, formatItemStatus } from '@/lib/formatItemStatus'
import { CatalogSearchForm } from '@/components/CatalogSearchForm'
import { ProfileAccessNotice } from '@/components/ProfileAccessNotice'
import { AddCatalogItemForm } from '@/components/AddCatalogItemForm'
import { UpdateCatalogItemForm } from '@/components/UpdateCatalogItemForm'
import { DeleteCatalogItemForm } from '@/components/DeleteCatalogItemForm'

type ItemsPageProps = {
  searchParams?: Promise<{
    q?: string | string[]
  }>
}

function getQueryValue(query: string | string[] | undefined): string {
  return Array.isArray(query) ? query[0] ?? '' : query ?? ''
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams
  const query = getQueryValue(params?.q)
  const normalizedQuery = query.trim()
  const items = normalizedQuery
    ? await searchCatalogItems(normalizedQuery)
    : await listCatalogItems()

  return (
    <main className="portal-page mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold">Item catalog</h1>
          <p className="text-slate-600">Search, add, and update items for the family inventory.</p>
        </div>
        <Link
          href="/admin"
          className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Admin view
        </Link>
      </header>
      <ProfileAccessNotice />
      <AddCatalogItemForm />
      <CatalogSearchForm query={query} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Items</h2>
          <span className="text-sm text-slate-500">
            {items.length} {normalizedQuery ? 'matching' : 'visible'}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {formatItemKind(item.kind)}
                      </span>
                    </div>
                    {item.note ? <p className="text-sm text-slate-500">{item.note}</p> : null}
                    {item.borrowerName || item.borrowedDate ? (
                      <p className="text-sm text-slate-500">
                        {[item.borrowerName ? `Borrower: ${item.borrowerName}` : null, item.borrowedDate ? `Date: ${item.borrowedDate}` : null]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {formatItemStatus(item.status)}
                  </span>
                </div>
                <UpdateCatalogItemForm item={item} />
                <DeleteCatalogItemForm item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            <p className="font-medium text-slate-900">No items match your search.</p>
            <p className="mt-1">Clear the search to return to the full catalog.</p>
            <Link href="/items" className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700">
              Clear search
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
