import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MODEL_PAGE_SIZE,
  searchModelPricing,
  type ModelPriceRow,
} from "@/lib/model-explorer.functions";
import { relativeTime } from "@/lib/sync-ledger";

type Search = { q?: string; provider?: string; page?: number };

export const Route = createFileRoute("/models")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 80) : undefined,
    provider: typeof s.provider === "string" && s.provider ? s.provider.slice(0, 60) : undefined,
    page: Number.isFinite(Number(s.page)) && Number(s.page) > 1 ? Math.floor(Number(s.page)) : undefined,
  }),
  loaderDeps: ({ search }) => ({
    q: search.q,
    provider: search.provider,
    page: search.page ?? 1,
  }),
  loader: ({ deps }) => searchModelPricing({ data: deps }),
  head: () => ({
    meta: [
      { title: "Pricing models explorer — tokensavr" },
      {
        name: "description",
        content:
          "Search every LLM provider and model tokensavr tracks, with the latest synced input and output price and when it last changed.",
      },
      { property: "og:title", content: "Pricing models explorer — tokensavr" },
      {
        property: "og:description",
        content:
          "Live per-million-token prices for every tracked model, sourced from our six-hourly pricing sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-warning" role="alert">
        model prices could not be loaded: {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-muted-foreground">no models found.</p>
    </div>
  ),
  component: ModelsExplorer,
});

function perMillion(v: number | null) {
  if (v === null) return "—";
  const dollars = v * 1_000_000;
  if (dollars === 0) return "$0.00";
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

function ModelsExplorer() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/models" });

  const [term, setTerm] = useState(search.q ?? "");

  // Keep the input in sync when the URL changes (back/forward, provider reset).
  useEffect(() => {
    setTerm(search.q ?? "");
  }, [search.q]);

  // Debounce typing into the URL so each keystroke doesn't refetch.
  useEffect(() => {
    const current = search.q ?? "";
    if (term === current) return;
    const id = setTimeout(() => {
      navigate({
        search: (prev) => ({ ...prev, q: term || undefined, page: undefined }),
        replace: true,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [term, search.q, navigate]);

  const totalPages = Math.max(1, Math.ceil(data.total / MODEL_PAGE_SIZE));
  const page = data.page;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="font-mono text-xs text-muted-foreground">pricing models explorer</p>
      <h1 className="mt-2 max-w-[640px] font-display text-3xl font-medium leading-[1.15] tracking-tight text-foreground sm:text-5xl">
        Search every model we price.
      </h1>
      <p className="mt-4 max-w-[560px] text-base leading-relaxed text-muted-foreground">
        Prices come straight from the pricing sync — per million tokens, with the moment each row
        last changed. {data.total.toLocaleString()} priced models tracked right now.
      </p>

      {/* controls */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="model-search" className="mb-1.5 block font-mono text-xs text-muted-foreground">
            search provider or model
          </label>
          <input
            id="model-search"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="claude, gpt-5, deepseek…"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="sm:w-56">
          <label htmlFor="provider-filter" className="mb-1.5 block font-mono text-xs text-muted-foreground">
            provider
          </label>
          <select
            id="provider-filter"
            value={search.provider ?? ""}
            onChange={(e) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  provider: e.target.value || undefined,
                  page: undefined,
                }),
              })
            }
            className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">all providers</option>
            {data.providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* table */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-mono text-[11px] text-muted-foreground">
              <th className="px-4 py-3 font-normal">model</th>
              <th className="px-4 py-3 font-normal">provider</th>
              <th className="px-4 py-3 text-right font-normal">input / 1M</th>
              <th className="px-4 py-3 text-right font-normal">output / 1M</th>
              <th className="px-4 py-3 text-right font-normal">context</th>
              <th className="px-4 py-3 text-right font-normal">last change</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-mono text-xs text-muted-foreground">
                  no models match that search
                </td>
              </tr>
            ) : (
              data.rows.map((row) => <ModelRow key={row.id} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          page {page} of {totalPages.toLocaleString()}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  page: page - 1 > 1 ? page - 1 : undefined,
                }),
              })
            }
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            ← prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelRow({ row }: { row: ModelPriceRow }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <p className="font-mono text-sm text-foreground">{row.model_id}</p>
        {row.display_name && row.display_name !== row.model_id ? (
          <p className="text-xs text-muted-foreground">{row.display_name}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {row.provider ?? "—"}
        <span className="ml-2 opacity-70">· {row.source}</span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
        {perMillion(row.input_cost_per_token)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
        {perMillion(row.output_cost_per_token)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {row.context_window ? `${(row.context_window / 1000).toFixed(0)}k` : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
        {relativeTime(row.updated_at)}
      </td>
    </tr>
  );
}
