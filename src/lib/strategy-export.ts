/**
 * Shared export helpers for generated strategies (PDF filename slugs + JSON download).
 */

export function strategySlug(idea: unknown): string {
  return (
    String(idea ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "strategy"
  );
}

export function strategyFilename(idea: unknown, ext: "pdf" | "json"): string {
  return `tokensavr-${strategySlug(idea)}.${ext}`;
}

/** Trigger a browser download of a text blob. */
function downloadBlob(contents: string, filename: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give Safari a tick before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export the full strategy payload as JSON so it can be re-imported,
 * diffed, or piped into other tools.
 */
export function downloadStrategyJson(strategy: Record<string, unknown>, filename?: string) {
  const payload = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    source: "tokensavr",
    strategy,
  };
  downloadBlob(
    JSON.stringify(payload, null, 2),
    filename ?? strategyFilename(strategy.idea, "json"),
    "application/json",
  );
}
