export type PlatformId =
  | "lovable"
  | "claude"
  | "chatgpt"
  | "cursor"
  | "bolt"
  | "v0"
  | "replit"
  | "windsurf"
  | "claudecode"
  | "githubcopilot"
  | "gemini";

export const PLATFORMS: Record<
  PlatformId,
  { id: PlatformId; name: string; color: string; initial: string }
> = {
  lovable: { id: "lovable", name: "Lovable", color: "oklch(0.72 0.17 350)", initial: "L" },
  claude: { id: "claude", name: "Claude", color: "oklch(0.68 0.16 38)", initial: "C" },
  chatgpt: { id: "chatgpt", name: "ChatGPT", color: "oklch(0.70 0.14 165)", initial: "G" },
  cursor: { id: "cursor", name: "Cursor", color: "oklch(0.78 0.04 270)", initial: "U" },
  bolt: { id: "bolt", name: "Bolt", color: "oklch(0.78 0.16 80)", initial: "B" },
  v0: { id: "v0", name: "v0", color: "oklch(0.92 0.01 270)", initial: "V" },
  replit: { id: "replit", name: "Replit", color: "oklch(0.70 0.18 35)", initial: "R" },
  windsurf: { id: "windsurf", name: "Windsurf", color: "oklch(0.72 0.13 195)", initial: "W" },
  claudecode: { id: "claudecode", name: "Claude Code", color: "oklch(0.68 0.16 38)", initial: "C" },
  githubcopilot: {
    id: "githubcopilot",
    name: "GitHub Copilot",
    color: "oklch(0.78 0.04 270)",
    initial: "G",
  },
  gemini: { id: "gemini", name: "Gemini", color: "oklch(0.70 0.16 250)", initial: "G" },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export function getPlatform(id: string) {
  let normalized = id.toLowerCase().replace(/[^a-z0-9]/g, "");
  // "Replit Agent" → "replit"
  if (normalized === "replitagent") normalized = "replit";
  // "Copilot" → "githubcopilot"
  if (normalized === "copilot") normalized = "githubcopilot";
  const key = normalized as PlatformId;
  return (
    PLATFORMS[key] ?? {
      id: "claude" as PlatformId,
      name: id,
      color: "oklch(0.55 0.05 270)",
      initial: id.charAt(0).toUpperCase(),
    }
  );
}

export const BUDGETS = [
  { id: "free", label: "Free tier only", desc: "5 Lovable credits + free Claude" },
  { id: "starter", label: "Starter ($20/mo)", desc: "Pro Lovable or Claude Pro" },
  { id: "pro", label: "Pro ($50/mo)", desc: "Multiple paid platforms" },
  { id: "custom", label: "Custom", desc: "Tell the AI your exact budget" },
] as const;
