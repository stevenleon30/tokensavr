import { Link } from "@tanstack/react-router";
import tokensavrLogo from "@/assets/tokensavr-logo.png";
import tokensavrDarkNav from "@/assets/tokensavr-dark-nav.svg";

// Brand hex colors — kept literal because these are external brands, not
// part of our themed palette. Picked to remain legible on both light and
// dark footer backgrounds (no pure white/black).
const FOOTER_PLATFORMS: { name: string; color: string }[] = [
  { name: "Lovable", color: "#FF4F8B" },
  { name: "Claude", color: "#D97757" },
  { name: "Claude Code", color: "#C96342" },
  { name: "ChatGPT", color: "#10A37F" },
  { name: "Gemini", color: "#4796E3" },
  { name: "Cursor", color: "#6E6E73" },
  { name: "Windsurf", color: "#0BAA9F" },
  { name: "GitHub Copilot", color: "#6E6E73" },
  { name: "Bolt", color: "#E0AE00" },
  { name: "v0", color: "#6E6E73" },
  { name: "Replit", color: "#F26207" },
];

const footerLinks = [
  { to: "/generate", label: "Generate" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tips", label: "Tips" },
  { to: "/docs", label: "Docs" },
] as const;

const legalLinks = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background dark:bg-[#0A0A0A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 group w-fit">
            <img
              src={tokensavrLogo}
              alt="TokenSavr"
              className="h-10 w-auto transition-transform group-hover:scale-105 dark:hidden"
            />
            <img
              src={tokensavrDarkNav}
              alt="TokenSavr"
              className="hidden dark:block h-14 sm:h-16 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {footerLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground">
            © {year} TokenSavr. All rights reserved.
          </p>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-4">
            Supported platforms
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {FOOTER_PLATFORMS.map((p) => (
              <li
                key={p.name}
                className="text-sm font-medium"
                style={{ color: p.color }}
              >
                {p.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            Estimates are AI-generated and approximate. Verify on the platform you use.
          </p>
        </div>
      </div>
    </footer>
  );
}
