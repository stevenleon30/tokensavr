import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieNotice } from "@/components/cookie-notice";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TokenSavr — Stop burning credits. Start building smart." },
      {
        name: "description",
        content:
          "Turn your app idea into a token-optimized build plan across Lovable, Claude, Cursor, ChatGPT, and more. Save credits, ship faster.",
      },
      { name: "author", content: "TokenSavr" },
      { property: "og:title", content: "TokenSavr — Stop burning credits. Start building smart." },
      {
        property: "og:description",
        content:
          "TokenSavr turns your app idea into the cheapest sequence of prompts across AI coding platforms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TokenSavr — Stop burning credits. Start building smart." },
      { name: "description", content: "Stop burning tokens. Start shipping leaner. TokenSavr is the token-efficiency playbook for vibe coders building with Claude, Lovable, and Cursor." },
      { property: "og:description", content: "Stop burning tokens. Start shipping leaner. TokenSavr is the token-efficiency playbook for vibe coders building with Claude, Lovable, and Cursor." },
      { name: "twitter:description", content: "Stop burning tokens. Start shipping leaner. TokenSavr is the token-efficiency playbook for vibe coders building with Claude, Lovable, and Cursor." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3b7dae22-ad8c-46d6-bd75-69b088e24c4f/id-preview-414ed117--e46ad49f-3dfe-41d2-908d-cdf603646bea.lovable.app-1776654826986.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3b7dae22-ad8c-46d6-bd75-69b088e24c4f/id-preview-414ed117--e46ad49f-3dfe-41d2-908d-cdf603646bea.lovable.app-1776654826986.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <Toaster />
        <CookieNotice />
      </AuthProvider>
    </ThemeProvider>
  );
}
