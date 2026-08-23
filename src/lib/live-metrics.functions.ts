import { createServerFn } from "@tanstack/react-start";
import type { NpmTrend, ProviderStatus } from "@/lib/live-metrics.server";

export const getNpmTrend = createServerFn({ method: "GET" }).handler(
  async (): Promise<NpmTrend> => {
    const { loadNpmTrend } = await import("@/lib/live-metrics.server");
    return loadNpmTrend();
  },
);

export const getProviderStatuses = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProviderStatus[]> => {
    const { loadProviderStatuses } = await import("@/lib/live-metrics.server");
    return loadProviderStatuses();
  },
);
