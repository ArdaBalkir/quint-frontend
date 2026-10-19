// Fixed vocabularies prevent identifiers, URLs and user input entering analytics.
const screens = {
  projects: "Projects",
  webalign: "WebAlign",
  webwarp: "WebWarp",
  webilastik: "WebIlastik",
  nutil: "WebNutil",
  meshview: "MeshView",
  plots: "Plots",
  agreement: "User agreement",
  login: "Login",
};
const events = {
  project: ["Workspace", "Project"],
  series: ["Workspace", "Image series"],
  createProject: ["Workspace", "Create project"],
  images: ["Upload", "Images"],
  segments: ["Upload", "Segmentations"],
  registration: ["Processing", "Generate registration"],
  conversion: ["Processing", "Convert images"],
  quantification: ["Processing", "Quantification"],
  exportResults: ["Results", "Export results"],
  backupSegments: ["Results", "Segmentation backup"],
  savePlots: ["Results", "Save for plotting"],
  loadPlot: ["Plots", "Load result"],
  mesh: ["MeshView", "Open result"],
  chart: ["Plots", "Change chart type"],
  docs: ["Help", "Documentation"],
  demo: ["Help", "Example dataset"],
  toolNavigation: ["Navigation", "Missing project or image series"],
};
const outcomes = new Set(["started", "submitted", "succeeded", "failed", "cancelled", "selected", "opened", "blocked"]);
let initialized = false;
let lastScreen;
let lastUrl;

function push(...commands) {
  // A blocked or unavailable tracker must never interrupt the application.
  try { window._paq.push(...commands); } catch { /* Analytics is best effort. */ }
}

export function initializeAnalytics() {
  if (initialized || typeof window === "undefined" || !import.meta.env.PROD) return;
  if (import.meta.env.VITE_MATOMO_ENABLED === "false") return;
  initialized = true;
  window._paq = window._paq || [];
  let referrer = "";
  try { referrer = new URL(document.referrer).origin + "/"; } catch { /* No referrer. */ }
  push(
    ["setTrackerUrl", "https://stats.humanbrainproject.eu/matomo.php"],
    ["setSiteId", "38"],
    ["setDoNotTrack", true],
    ["setReferrerUrl", referrer],
    ["enableHeartBeatTimer", 15],
  );
  // Explicit events replace automatic link tracking: links may contain signed
  // URLs, tokens, bucket paths or filenames, including generated downloads.
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://stats.humanbrainproject.eu/matomo.js";
  document.head.appendChild(script);
}

export function trackScreen(screen) {
  if (!initialized || !Object.hasOwn(screens, screen) || screen === lastScreen) return;
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.hash = `/view/${screen}`;
  if (lastUrl) push(["setReferrerUrl", lastUrl], ["disablePerformanceTracking"]);
  push(
    ["setCustomUrl", url.href],
    ["setDocumentTitle", `QUINT Online / ${screens[screen]}`],
    ["deleteCustomVariables", "page"],
    ["trackPageView"],
  );
  lastScreen = screen;
  lastUrl = url.href;
}

export function trackUsage(event, outcome, count) {
  if (!initialized || !lastScreen || !Object.hasOwn(events, event) || !outcomes.has(outcome)) return;
  const [category, name] = events[event];
  const command = ["trackEvent", category, outcome, name];
  if (Number.isFinite(count) && count >= 0) command.push(count);
  push(command);
}
