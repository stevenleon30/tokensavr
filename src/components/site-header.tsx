import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { to: "/pricing", label: "Pricing", authOnly: false },
  { to: "/models", label: "Models", authOnly: false },

  { to: "/docs", label: "Docs", authOnly: false },
  { to: "/pricing-sync", label: "Sync log", authOnly: false },
  { to: "/generate", label: "Generate", authOnly: false },
  { to: "/dashboard", label: "Dashboard", authOnly: true },
  { to: "/history", label: "History", authOnly: true },
] as const;

function Wordmark() {
  return (
    <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
      token<span className="text-primary">savr</span>
    </span>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [open, setOpen] = useState(false);

  const items = navItems.filter((item) => !item.authOnly || user);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" onClick={() => setOpen(false)} aria-label="tokensavr home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {items.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={handleSignOut}
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              search={{ idea: undefined, redirect: undefined }}
              className="hidden rounded-lg bg-foreground px-4 py-2 font-mono text-xs text-background transition-opacity hover:opacity-85 sm:inline-block"
            >
              Create free account
            </Link>
          )}

          <button
            className="md:hidden text-foreground"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-sm text-muted-foreground last:border-0 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/auth"
              search={{ idea: undefined, redirect: undefined }}
              onClick={() => setOpen(false)}
              className="my-3 rounded-lg bg-foreground px-4 py-2 text-center font-mono text-xs text-background"
            >
              Get your API key
            </Link>
            {user ? (
              <button
                onClick={handleSignOut}
                className="pb-3 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
