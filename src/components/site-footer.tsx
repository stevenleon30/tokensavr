import { Link } from "@tanstack/react-router";
import tokensavrLogo from "@/assets/tokensavr-logo.png";
import tokensavrDarkNav from "@/assets/tokensavr-dark-nav.svg";
import claudeLogo from "@/assets/logos/claude.svg";
import lovableLogo from "@/assets/logos/lovable.svg";
import cursorLogo from "@/assets/logos/cursor.svg";
import boltLogo from "@/assets/logos/bolt.svg";
import chatgptLogo from "@/assets/logos/chatgpt.svg";
import v0Logo from "@/assets/logos/v0.svg";
import replitLogo from "@/assets/logos/replit.svg";
import windsurfLogo from "@/assets/logos/windsurf.svg";
import claudeCodeLogo from "@/assets/logos/claude-code.svg";
import copilotLogo from "@/assets/logos/copilot.svg";
import geminiLogo from "@/assets/logos/gemini.svg";

const FOOTER_PLATFORMS = [
  { name: "Lovable", src: lovableLogo },
  { name: "Claude", src: claudeLogo },
  { name: "Claude Code", src: claudeCodeLogo },
  { name: "ChatGPT", src: chatgptLogo },
  { name: "Gemini", src: geminiLogo },
  { name: "Cursor", src: cursorLogo },
  { name: "Windsurf", src: windsurfLogo },
  { name: "GitHub Copilot", src: copilotLogo },
  { name: "Bolt", src: boltLogo },
  { name: "v0", src: v0Logo },
  { name: "Replit", src: replitLogo },
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
