import { getPlatform } from "@/lib/platforms";

export function PlatformBadge({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const p = getPlatform(id);
  const sizes = size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${sizes} flex items-center justify-center rounded-md font-bold text-background`}
        style={{ backgroundColor: p.color }}
        aria-hidden
      >
        {p.initial}
      </span>
      <span className={size === "sm" ? "text-xs" : "text-sm"}>{p.name}</span>
    </span>
  );
}
