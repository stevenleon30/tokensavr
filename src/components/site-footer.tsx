import { Link } from "@tanstack/react-router";

const footerLinks = [
  { to: "/generate", label: "Generate" },
  { to: "/pricing", label: "Pricing" },
  { to: "/pricing-sync", label: "Sync log" },
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
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="w-fit">
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              token<span className="text-primary">savr</span>
            </span>
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
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-xs text-muted-foreground">
            © {year} tokensavr · prices verified against provider sources
          </p>
        </div>
      </div>
    </footer>
  );
}
