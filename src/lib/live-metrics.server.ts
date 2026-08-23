export type ProviderStatus = {
  name: string;
  status: "none" | "minor" | "major" | "critical" | "unknown";
};

export type NpmWeek = { weekEnding: string; downloads: number };

export type NpmTrend = {
  totalWeeklyDownloads: number;
  packages: { name: string; downloads: number }[];
  weeks: NpmWeek[];
  lastUpdated: string;
};


const NPM_PACKAGES = ["openai", "@anthropic-ai/sdk", "@google/generative-ai", "groq-sdk"];

const STATUSPAGE_PROVIDERS = [
  { name: "OpenAI", statusUrl: "https://status.openai.com/api/v2/status.json" },
  { name: "Anthropic", statusUrl: "https://status.claude.com/api/v2/status.json" },
  { name: "Groq", statusUrl: "https://groqstatus.com/api/v2/status.json" },
];

// module-scope caches (per worker isolate)
const NPM_TTL = 12 * 60 * 60 * 1000;
const STATUS_TTL = 5 * 60 * 1000;
let npmCache: { at: number; data: NpmTrend } | null = null;
let statusCache: { at: number; data: ProviderStatus[] } | null = null;

async function fetchJson(url: string, ms = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const WEEKS = 12;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function loadNpmTrend(): Promise<NpmTrend> {
  if (npmCache && Date.now() - npmCache.at < NPM_TTL) return npmCache.data;

  // npm counts settle a day late; end the window yesterday.
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * 24 * 60 * 60 * 1000);
  const range = `${isoDay(start)}:${isoDay(end)}`;

  const results = await Promise.all(
    NPM_PACKAGES.map(async (pkg) => {
      try {
        const json = (await fetchJson(
          `https://api.npmjs.org/downloads/range/${range}/${encodeURIComponent(pkg)}`,
        )) as { downloads?: { day?: string; downloads?: number }[] };
        const days = Array.isArray(json?.downloads) ? json.downloads : [];
        return {
          name: pkg,
          days: days.map((d) => ({ day: String(d?.day ?? ""), downloads: Number(d?.downloads ?? 0) })),
        };
      } catch {
        return { name: pkg, days: [] as { day: string; downloads: number }[] };
      }
    }),
  );

  // sum every package per calendar day
  const perDay = new Map<string, number>();
  for (const r of results) {
    for (const d of r.days) {
      if (!d.day) continue;
      perDay.set(d.day, (perDay.get(d.day) ?? 0) + d.downloads);
    }
  }
  const ordered = [...perDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // bucket trailing days into whole weeks of 7, oldest first
  const usable = ordered.slice(Math.max(0, ordered.length - WEEKS * 7));
  const weeks: NpmWeek[] = [];
  for (let i = 0; i + 7 <= usable.length; i += 7) {
    const bucket = usable.slice(i, i + 7);
    weeks.push({
      weekEnding: bucket[bucket.length - 1][0],
      downloads: bucket.reduce((sum, [, n]) => sum + n, 0),
    });
  }

  const packages = results.map((r) => ({
    name: r.name,
    downloads: r.days.slice(-7).reduce((sum, d) => sum + d.downloads, 0),
  }));

  const data: NpmTrend = {
    packages,
    weeks,
    totalWeeklyDownloads: weeks.length > 0 ? weeks[weeks.length - 1].downloads : 0,
  };

  // never cache a fully-failed read
  if (data.totalWeeklyDownloads > 0) npmCache = { at: Date.now(), data };
  return data;
}


function indicatorFrom(value: unknown): ProviderStatus["status"] {
  return value === "none" || value === "minor" || value === "major" || value === "critical"
    ? value
    : "unknown";
}

async function googleStatus(): Promise<ProviderStatus> {
  try {
    const incidents = (await fetchJson("https://status.cloud.google.com/incidents.json")) as
      | { end?: string | null; severity?: string; affected_products?: { title?: string }[] }[]
      | null;
    if (!Array.isArray(incidents)) return { name: "Google", status: "unknown" };

    const open = incidents.filter(
      (i) =>
        !i.end &&
        (i.affected_products ?? []).some((p) => /vertex ai|generative|gemini/i.test(p.title ?? "")),
    );
    if (open.length === 0) return { name: "Google", status: "none" };
    const high = open.some((i) => i.severity === "high");
    return { name: "Google", status: high ? "major" : "minor" };
  } catch {
    return { name: "Google", status: "unknown" };
  }
}

export async function loadProviderStatuses(): Promise<ProviderStatus[]> {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL) return statusCache.data;

  const statuspage = await Promise.all(
    STATUSPAGE_PROVIDERS.map(async (p) => {
      try {
        const json = (await fetchJson(p.statusUrl)) as { status?: { indicator?: string } };
        return { name: p.name, status: indicatorFrom(json?.status?.indicator) };
      } catch {
        return { name: p.name, status: "unknown" as const };
      }
    }),
  );

  const google = await googleStatus();
  const data: ProviderStatus[] = [statuspage[0], statuspage[1], google, statuspage[2]].filter(
    Boolean,
  ) as ProviderStatus[];

  statusCache = { at: Date.now(), data };
  return data;
}
