import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const footerLinks = [
  { to: "/generate", label: "Generate" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/tips", label: "Tips" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 group w-fit">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">TokenSavvy</span>
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
            © {year} TokenSavvy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
