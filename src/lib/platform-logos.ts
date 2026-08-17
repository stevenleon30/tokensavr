import type { PlatformId } from "@/lib/platforms";
import claudeLogo from "@/assets/logos/claude.svg";
import lovableLogo from "@/assets/logos/lovable.svg";
import cursorLogo from "@/assets/logos/cursor.svg";
import boltLogo from "@/assets/logos/bolt.svg";
import chatgptLogo from "@/assets/logos/chatgpt.svg";
import replitLogo from "@/assets/logos/replit.svg";
import windsurfLogo from "@/assets/logos/windsurf.svg";
import claudeCodeLogo from "@/assets/logos/claude-code.svg";
import copilotLogo from "@/assets/logos/copilot.svg";
import geminiLogo from "@/assets/logos/gemini.svg";

export const LOGO_MAP: Partial<Record<PlatformId, string>> = {
  lovable: lovableLogo,
  claude: claudeLogo,
  chatgpt: chatgptLogo,
  cursor: cursorLogo,
  bolt: boltLogo,
  replit: replitLogo,
  windsurf: windsurfLogo,
  claudecode: claudeCodeLogo,
  githubcopilot: copilotLogo,
  gemini: geminiLogo,
};

/** Short cost-role hint shown on the homepage platform cards. */
export const PLATFORM_HINTS: Partial<Record<PlatformId, string>> = {
  lovable: "Best builder",
  claude: "Cheapest planner",
  claudecode: "Deep refactors",
  chatgpt: "Fast reasoning",
  gemini: "Long context",
  cursor: "Precise edits",
  windsurf: "Flow builds",
  githubcopilot: "Inline autocomplete",
  bolt: "Quick prototypes",
  replit: "Instant deploys",
};
