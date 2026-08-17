import { Link } from "@tanstack/react-router";
import tokensavrLogo from "@/assets/tokensavr-logo.png";
import tokensavrDarkNav from "@/assets/tokensavr-dark-nav.svg";


const footerLinks = [
  { to: "/generate", label: "Generate" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tips", label: "Tips" },
  { to: "/pricing", label: "LLM Cost Comparison" },
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
