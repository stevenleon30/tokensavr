import { useEffect, useMemo, useState } from "react";
import {
  buildLedger,
  LEDGER_WINDOW_DAYS,
  monthLabels,
  relativeTime,
  summarizeLedger,
  toWeeks,
  type LedgerDay,
  type LedgerWindow,
  type SyncRun,
} from "@/lib/sync-ledger";

const LEVEL_CLASS: Record<LedgerDay["level"], string> = {
  0: "bg-ledger-0 border border-border",
  1: "bg-ledger-1",
  2: "bg-ledger-2",
  3: "bg-ledger-3",
  4: "bg-ledger-4",
};

const CELL_RADIUS = { borderRadius: "2px 2px 3px 3px" } as const;

const WINDOWS: { id: LedgerWindow; label: string; cell: number; gap: number }[] = [
  { id: "12w", label: "12w", cell: 52, gap: 8 },
  { id: "1y", label: "1y", cell: 17, gap: 4 },
];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function RailStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{value}</p>
      {hint ? (
        <p className="font-mono text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}


export function PricingSyncLedger({
  runs,
  checksLastYear,
  modelsTracked,
  providersTracked,
  serverNow,
}: {
  runs: SyncRun[];
  checksLastYear: number;
  modelsTracked?: number;
  providersTracked?: number;
  serverNow?: string;
}) {
  const [hovered, setHovered] = useState<LedgerDay | null>(null);
  const [windowId, setWindowId] = useState<LedgerWindow>("12w");

  // Stable clock for SSR/hydration match; tick to client time after mount.
  const [now, setNow] = useState(() =>
    serverNow ? new Date(serverNow).getTime() : Date.now(),
  );
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const active = WINDOWS.find((w) => w.id === windowId) ?? WINDOWS[0]!;
  const days = useMemo(
    () => buildLedger(runs, new Date(now), LEDGER_WINDOW_DAYS[windowId]),
    [runs, windowId, now],
  );
  const weeks = toWeeks(days);
  const months = monthLabels(weeks);
  const summary = useMemo(() => summarizeLedger(days, runs), [days, runs]);
  const latest = runs[0];

  const headlineChecks = windowId === "1y" ? checksLastYear : summary.totalChecks;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">pricing sync ledger</p>
          <p className="mt-1 font-display text-4xl font-medium tabular-nums text-foreground sm:text-5xl">
            {headlineChecks.toLocaleString()}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            price checks in the {windowId === "1y" ? "last year" : "last 12 weeks"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindowId(w.id)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                w.id === windowId
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* grid, full width */}
      <div className="mt-6 overflow-x-auto pb-1">
        <div className="inline-flex gap-2">
          {/* day-of-week labels */}
          <div
            className="flex flex-col justify-between font-mono text-[10px] leading-none text-muted-foreground"
            style={{ paddingTop: 18 }}
          >
            <span>mon</span>
            <span>wed</span>
            <span>fri</span>
          </div>

          <div>
            <div className="flex" style={{ gap: active.gap }}>
              {months.map((label, i) => (
                <div
                  key={i}
                  className="font-mono text-[10px] leading-4 text-muted-foreground"
                  style={{ width: active.cell }}
                >
                  <span className="whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: active.gap }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: active.gap }}>
                  {week.map((day) => (
                    <div
                      key={day.date}
                      style={{ ...CELL_RADIUS, height: active.cell, width: active.cell }}
                      className={LEVEL_CLASS[day.level]}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      title={`${formatDate(day.date)} — ${day.updated.toLocaleString()} updates`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span>fewer checks</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              style={CELL_RADIUS}
              className={`h-[11px] w-[11px] ${LEVEL_CLASS[level]}`}
            />
          ))}
          <span>more checks</span>
        </div>

        <p className="min-h-[1rem] font-mono text-[10px] text-muted-foreground">
          {hovered ? (
            <>
              <span className="text-foreground">
                {hovered.updated.toLocaleString()} updates
              </span>{" "}
              · {formatDate(hovered.date)} · {hovered.runs}{" "}
              {hovered.runs === 1 ? "run" : "runs"} logged
              {hovered.hadFailure ? " · includes a failure" : ""}
            </>
          ) : (
            "hover a day for its update count"
          )}
        </p>
      </div>

      {/* metrics, horizontal under the grid */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-5">
        <RailStat
          label="last sync"
          value={latest ? relativeTime(latest.run_at, now) : "—"}
          hint={
            latest ? `${latest.models_checked.toLocaleString()} models checked` : "no runs yet"
          }
        />
        <RailStat
          label="active days"
          value={`${summary.activeDays}/${days.length}`}
          hint={`${summary.streakDays} day streak`}
        />
        <RailStat
          label="runs logged"
          value={summary.totalRuns.toLocaleString()}
          hint={
            summary.runsPerActiveDay > 0
              ? `${summary.runsPerActiveDay.toFixed(1)} per active day`
              : undefined
          }
        />
        <RailStat
          label="prices written"
          value={summary.totalUpdated.toLocaleString()}
          hint={
            summary.busiest
              ? `peak ${summary.busiest.updated.toLocaleString()} on ${formatDate(summary.busiest.date)}`
              : undefined
          }
        />
        {modelsTracked !== undefined ? (
          <RailStat
            label="coverage"
            value={`${modelsTracked.toLocaleString()} models`}
            hint={providersTracked ? `${providersTracked} providers` : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

