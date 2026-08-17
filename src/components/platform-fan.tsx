import { PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { LOGO_MAP, PLATFORM_HINTS } from "@/lib/platform-logos";
import { Check } from "lucide-react";

type Props = {
  selected: string[];
  onToggle: (id: string) => void;
};

/**
 * Arched fan of tall platform cards. Outer cards are rotated and pushed
 * down so the row reads as an arc; hovering or selecting lifts a card
 * back to upright.
 */
export function PlatformFan({ selected, onToggle }: Props) {
  const items = PLATFORM_LIST;
  const mid = (items.length - 1) / 2;

  return (
    <div className="mt-14">
      <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
        Pick the platforms you have access to
      </p>

      {/* Mobile: scroll-snap rail */}
      <div className="mt-6 flex gap-3 overflow-x-auto px-1 pb-4 snap-x snap-mandatory md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <PlatformCard
            key={p.id}
            id={p.id}
            name={p.name}
            color={p.color}
            active={selected.includes(p.id)}
            onToggle={onToggle}
            className="snap-center shrink-0 w-[124px] h-[168px]"
          />
        ))}
      </div>

      {/* Desktop/tablet: arched fan */}
      <div className="mt-8 hidden md:flex items-end justify-center pb-10">
        {items.map((p, i) => {
          const offset = (i - mid) / mid; // -1 … 1
          const rotate = offset * 9;
          const drop = Math.abs(offset) ** 2 * 44;
          const active = selected.includes(p.id);
          return (
            <div
              key={p.id}
              className="-mx-1.5 transition-transform duration-300 ease-out hover:z-20"
              style={{
                transform: `rotate(${rotate}deg) translateY(${drop}px)`,
                zIndex: active ? 30 : Math.round(20 - Math.abs(offset) * 10),
              }}
            >
              <PlatformCard
                id={p.id}
                name={p.name}
                color={p.color}
                active={active}
                onToggle={onToggle}
                className="w-[104px] h-[164px] lg:w-[118px] lg:h-[184px] hover:-translate-y-3"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformCard({
  id,
  name,
  color,
  active,
  onToggle,
  className = "",
}: {
  id: PlatformId;
  name: string;
  color: string;
  active: boolean;
  onToggle: (id: string) => void;
  className?: string;
}) {
  const logo = LOGO_MAP[id];
  const hint = PLATFORM_HINTS[id];

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={`group relative flex flex-col items-center justify-between rounded-2xl border bg-card p-3 text-center shadow-card transition-all duration-300 ease-out ${
        active
          ? "border-primary/70 ring-2 ring-primary/40 shadow-elegant -translate-y-2"
          : "border-border hover:border-primary/40 hover:shadow-elegant"
      } ${className}`}
      style={active ? { boxShadow: `0 12px 32px -12px ${color}` } : undefined}
    >
      <span
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-70"
        style={{ backgroundColor: color }}
        aria-hidden
      />

      <span className="flex flex-1 items-center justify-center">
        {logo ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-border">
            <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
          </span>
        ) : (
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-background"
            style={{ backgroundColor: color }}
            aria-hidden
          >
            {name.charAt(0)}
          </span>
        )}
      </span>

      <span className="w-full">
        <span className="block text-xs font-semibold tracking-tight leading-tight">{name}</span>
        {hint ? (
          <span className="mt-1 block text-[10px] text-muted-foreground leading-tight">{hint}</span>
        ) : null}
      </span>

      {active ? (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}
