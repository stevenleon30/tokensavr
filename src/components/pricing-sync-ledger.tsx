import { useState } from "react";
import {
  buildLedger,
  monthLabels,
  toWeeks,
  type LedgerDay,
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

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PricingSyncLedger({
  runs,
  checksLastYear,
}: {
  runs: SyncRun[];
  checksLastYear: number;
}) {
  const [hovered, setHovered] = useState<LedgerDay | null>(null);
  const days = buildLedger(runs);
  const weeks = toWeeks(days);
  const months = monthLabels(weeks);

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">pricing sync ledger</p>
          <p className="mt-1 font-display text-4xl font-medium tabular-nums text-foreground sm:text-5xl">
            {checksLastYear.toLocaleString()}
          </p>
          <p className="font-mono text-xs text-muted-foreground">price checks in the last year</p>
        </div>

        <div className="min-h-[2.5rem] text-right font-mono text-xs text-muted-foreground">
          {hovered ? (
            <>
              <p className="text-foreground">
                {hovered.updated.toLocaleString()} updates
              </p>
              <p>{formatDate(hovered.date)}</p>
              <p>
                {hovered.runs} {hovered.runs === 1 ? "run" : "runs"} logged
                {hovered.hadFailure ? " · includes a failure" : ""}
              </p>
            </>
          ) : (
            <p>hover a day for its update count</p>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="inline-flex gap-2">
          {/* day-of-week labels */}
          <div className="flex flex-col justify-between pt-[18px] font-mono text-[10px] leading-none text-muted-foreground">
            <span>mon</span>
            <span>wed</span>
            <span>fri</span>
          </div>

          <div>
            <div className="flex gap-[3px]">
              {months.map((label, i) => (
                <div
                  key={i}
                  className="w-[11px] font-mono text-[10px] leading-4 text-muted-foreground"
                >
                  <span className="whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      style={CELL_RADIUS}
                      className={`h-[11px] w-[11px] ${LEVEL_CLASS[day.level]}`}
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

      <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] text-muted-foreground">
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
    </div>
  );
}
