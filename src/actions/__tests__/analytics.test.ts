import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let analytics: typeof import("../../utils/analytics.js");
let queue: unknown[][];
let append: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("PROD", true);
  vi.stubEnv("BASE_URL", "/quint/");
  vi.stubEnv("VITE_MATOMO_ENABLED", "true");
  queue = [];
  append = vi.fn();
  vi.stubGlobal("window", {
    _paq: queue,
    location: { origin: "https://quint.example", href: "https://quint.example/?code=secret#access_token=secret" },
  });
  vi.stubGlobal("document", {
    referrer: "https://auth.example/callback?token=secret",
    createElement: () => ({}), head: { appendChild: append },
  });
  analytics = await import("../../utils/analytics.js");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("SPA analytics", () => {
  it("initializes once, tracks transitions once and removes sensitive URL data", () => {
    analytics.initializeAnalytics();
    analytics.initializeAnalytics();
    expect(append).toHaveBeenCalledTimes(1);
    expect(queue).toContainEqual(["setDoNotTrack", true]);
    expect(queue).toContainEqual(["enableHeartBeatTimer", 15]);
    expect(queue).toContainEqual(["setReferrerUrl", "https://auth.example/"]);
    analytics.trackScreen("projects");
    analytics.trackScreen("projects");
    analytics.trackScreen("nutil");
    analytics.trackScreen("nutil");
    analytics.trackScreen("projects");
    expect(queue.filter(([method]) => method === "trackPageView")).toHaveLength(3);
    expect(queue).toContainEqual(["setCustomUrl", "https://quint.example/quint/#/view/nutil"]);
    expect(queue).toContainEqual(["setReferrerUrl", "https://quint.example/quint/#/view/projects"]);
    expect(queue).toContainEqual(["disablePerformanceTracking"]);
    expect(JSON.stringify(queue)).not.toContain("secret");
    expect(queue.some(([method]) => method === "enableLinkTracking")).toBe(false);
  });

  it("rejects arbitrary labels, outcomes and invalid counts", () => {
    analytics.initializeAnalytics();
    analytics.trackUsage("images", "started", 3); // No view yet.
    analytics.trackScreen("token=secret");
    analytics.trackScreen("__proto__");
    analytics.trackScreen("projects");
    analytics.trackUsage("secret", "started", 3);
    analytics.trackUsage("__proto__", "started", 3);
    analytics.trackUsage("images", "secret", 3);
    analytics.trackUsage("images", "started", 3);
    analytics.trackUsage("images", "failed", NaN);
    analytics.trackUsage("segments", "failed", -1);
    expect(queue.filter(([method]) => method === "trackEvent")).toEqual([
      ["trackEvent", "Upload", "started", "Images", 3],
      ["trackEvent", "Upload", "failed", "Images"],
      ["trackEvent", "Upload", "failed", "Segmentations"],
    ]);
    expect(JSON.stringify(queue)).not.toContain("secret");
  });

  it.each(["development", "disabled"])("does not load or queue tracking when %s", (mode) => {
    if (mode === "development") vi.stubEnv("PROD", false);
    else vi.stubEnv("VITE_MATOMO_ENABLED", "false");
    analytics.initializeAnalytics();
    analytics.trackScreen("projects");
    analytics.trackUsage("images", "started", 3);
    expect(queue).toEqual([]);
    expect(append).not.toHaveBeenCalled();
  });

  it("does not throw when the tracking queue is unavailable", () => {
    analytics.initializeAnalytics();
    window._paq = { push: () => { throw new Error("blocked"); } };
    expect(() => analytics.trackScreen("projects")).not.toThrow();
    expect(() => analytics.trackUsage("images", "started", 3)).not.toThrow();
  });
});
