import Link from "next/link";

type CatalogSearchFormProps = {
  query: string;
};

export function CatalogSearchForm({ query }: CatalogSearchFormProps) {
  return (
    <form action="/items" method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Search catalog</span>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Title, note, borrower, or kind"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
        />
      </label>
      <button
        type="submit"
        className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Search
      </button>
      {query.trim() ? (
        <Link
          href="/items"
          className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
