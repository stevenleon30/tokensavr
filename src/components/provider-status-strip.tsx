import type { ProviderStatus } from "@/lib/live-metrics.server";

const DOT: Record<ProviderStatus["status"], string> = {
  none: "bg-success",
  minor: "bg-primary",
  major: "bg-warning",
  critical: "bg-destructive",
  unknown: "bg-muted-foreground/50",
};

const LABEL: Record<ProviderStatus["status"], string> = {
  none: "operational",
  minor: "minor incident",
  major: "major incident",
  critical: "critical incident",
  unknown: "status unknown",
};

export function ProviderStatusStrip({ providers }: { providers: ProviderStatus[] }) {
  if (providers.length === 0) return null;

  return (
    <div>
      <p className="font-mono text-xs text-muted-foreground">provider status</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {providers.map((p) => (
          <span
            key={p.name}
            title={`${p.name} — ${LABEL[p.status]}`}
            className="flex items-center gap-2 font-mono text-xs text-foreground"
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[p.status]}`} />
            {p.name}
            <span className="sr-only">{LABEL[p.status]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
