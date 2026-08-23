export type ProviderStatus = {
  name: string;
  status: "none" | "minor" | "major" | "critical" | "unknown";
};

export type NpmTrend = {
  totalWeeklyDownloads: number;
  packages: { name: string; downloads: number }[];
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

export async function loadNpmTrend(): Promise<NpmTrend> {
  if (npmCache && Date.now() - npmCache.at < NPM_TTL) return npmCache.data;

  const results = await Promise.all(
    NPM_PACKAGES.map(async (pkg) => {
      try {
        const json = (await fetchJson(
          `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`,
        )) as { downloads?: number };
        return { name: pkg, downloads: Number(json?.downloads ?? 0) };
      } catch {
        return { name: pkg, downloads: 0 };
      }
    }),
  );

  const data: NpmTrend = {
    packages: results,
    totalWeeklyDownloads: results.reduce((sum, r) => sum + r.downloads, 0),
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
