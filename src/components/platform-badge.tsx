import { getPlatform, type PlatformId } from "@/lib/platforms";
import { LOGO_MAP } from "@/lib/platform-logos";


export function PlatformBadge({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const p = getPlatform(id);
  const logo = LOGO_MAP[p.id as PlatformId];
  const tile = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className="inline-flex items-center gap-1.5">
      {logo ? (
        <span
          className={`${tile} flex items-center justify-center rounded-md bg-white p-0.5 ring-1 ring-border`}
          aria-hidden
        >
          <img
            src={logo}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </span>
      ) : (
        <span
          className={`${tile} flex items-center justify-center rounded-md font-bold text-background ${size === "sm" ? "text-[10px]" : "text-xs"}`}
          style={{ backgroundColor: p.color }}
          aria-hidden
        >
          {p.initial}
        </span>
      )}
      <span className={text}>{p.name}</span>
    </span>
  );
}
