import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PlatformBadge } from "@/components/platform-badge";
import type { PlatformId } from "@/lib/platforms";

type Tip = {
  platform: PlatformId;
  title: string;
  body: string;
  example: string;
};

const TIPS: Tip[] = [
  {
    platform: "lovable",
    title: "Use Chat Mode for planning, Build Mode for assembly",
    body: "Chat Mode costs ~1 credit per message; Build Mode is usage-based and far more expensive. Plan your architecture in Chat first, then send one polished Build prompt.",
    example: "Chat: 'Outline the data model for a tasks app with teams.' → Build: 'Implement the schema, components, and routes from the plan above.'",
  },
  {
    platform: "lovable",
    title: "Batch related changes",
    body: "Five tiny Build Mode messages cost much more than one batched message. Group UI tweaks, copy fixes, and small bugs into a single prompt.",
    example: "Instead of 'fix header', then 'fix footer', send: 'Fix header padding, footer color, and the hero button alignment.'",
  },
  {
    platform: "lovable",
    title: "Use templates and existing components",
    body: "Generating from scratch burns more tokens than tweaking existing scaffolds. Start from a template close to your goal.",
    example: "Pick a SaaS landing template, then ask only for what's different.",
  },
  {
    platform: "claude",
    title: "Keep your SKILL.md short",
    body: "In Claude Code, every byte in SKILL.md is re-sent each turn. Trim aggressively — link out to docs instead of pasting them.",
    example: "Replace a 200-line style guide with: 'See style.md for full rules.'",
  },
  {
    platform: "claude",
    title: "Close unused files between turns",
    body: "Open files inflate context. Close anything you're not actively editing before sending the next message.",
    example: "After finishing the API layer, close those files before starting on the UI.",
  },
  {
    platform: "claude",
    title: "Start fresh chats for new tasks",
    body: "Carrying a 50-message thread into a new feature means you pay for every previous token. Fork a new chat.",
    example: "Done with auth? Start a new conversation for the billing flow.",
  },
  {
    platform: "cursor",
    title: "Prefer /compose over Cmd+K on large files",
    body: "Cmd+K sends the whole file as context. /compose is targeted and uses far fewer tokens for the same edit.",
    example: "Use /compose 'add error handling to handleSubmit' instead of Cmd+K on a 500-line component.",
  },
  {
    platform: "cursor",
    title: "Pin only what's needed",
    body: "Pinned files are sent every turn. Unpin once they're no longer relevant.",
    example: "Pin auth.ts while building login, unpin once shipped.",
  },
  {
    platform: "chatgpt",
    title: "Use GPT-4o-mini for simple tasks",
    body: "Drafting copy, summarizing logs, formatting JSON — none of these need GPT-4o or o1. Mini is 10–30× cheaper.",
    example: "Use mini for: 'Rewrite this paragraph in 30 words.' Use the heavy model for: 'Design a sharded queue system.'",
  },
  {
    platform: "chatgpt",
    title: "Set custom instructions to skip preamble",
    body: "If GPT keeps adding 'Sure! Here's what you asked for:' you're paying for those tokens. Tell it to skip pleasantries.",
    example: "Custom instruction: 'Respond directly without restating the question or adding closing remarks.'",
  },
  {
    platform: "bolt",
    title: "Iterate with smaller diffs",
    body: "Bolt re-bundles your project on each change. Small, focused asks ship faster and cheaper than 'redesign everything'.",
    example: "Ask for one component at a time, not 'a full marketing site'.",
  },
  {
    platform: "v0",
    title: "Generate components, not whole pages",
    body: "v0 is best at single components. Compose them yourself rather than asking for full layouts.",
    example: "Ask for 'a pricing card with 3 tiers' rather than 'a SaaS pricing page'.",
  },
];

export const Route = createFileRoute("/tips")({
  head: () => ({
    meta: [
      { title: "Platform tips library — TokenSavr" },
      {
        name: "description",
        content:
          "Curated tactics to save credits across Lovable, Claude, Cursor, ChatGPT, Bolt, and v0.",
      },
    ],
  }),
  component: TipsPage,
});

const PLATFORM_FILTERS: { id: PlatformId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lovable", label: "Lovable" },
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "bolt", label: "Bolt" },
  { id: "v0", label: "v0" },
];

function TipsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlatformId | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TIPS.filter((t) => {
      if (filter !== "all" && t.platform !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.example.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Platform Tips Library</h1>
        <p className="mt-2 text-muted-foreground">
          Concrete tactics to spend fewer credits without shipping less.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tips…"
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tips match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t, i) => (
            <article
              key={i}
              className="rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40"
            >
              <PlatformBadge id={t.platform} size="sm" />
              <h3 className="mt-3 font-medium tracking-tight">{t.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
              <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Example
                </div>
                <p className="text-xs font-mono text-foreground/80 leading-relaxed">{t.example}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
