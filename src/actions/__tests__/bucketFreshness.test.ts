import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBucketJson, downloadWalnJson, fetchBrainStatsNormalized } from "../handleCollabs";

afterEach(() => vi.unstubAllGlobals());

describe("bucket data freshness", () => {
  it.each([
    ["registration.waln", downloadWalnJson],
    ["webnutil_settings.json", downloadBucketJson],
  ])("bypasses caching on both download steps for %s", async (path, download) => {
    const signedUrl = "https://storage.example/file?signature=original";
    const signal = new AbortController().signal;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: signedUrl }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ revision: 2 }) });
    vi.stubGlobal("fetch", fetchMock);

    expect(await download("token", "bucket", path, signal)).toEqual({ revision: 2 });
    expect(fetchMock).toHaveBeenNthCalledWith(1,
      `https://data-proxy.ebrains.eu/api/v1/buckets/bucket/${path}?redirect=false`,
      expect.objectContaining({ cache: "no-store", signal, headers: expect.objectContaining({ Authorization: "Bearer token" }) }),
    );
    // Preserve signed URLs and do not forward the API token to storage.
    expect(fetchMock).toHaveBeenNthCalledWith(2, signedUrl, { cache: "no-store", signal });
  });

  it("bypasses caching when listing registration metadata", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ objects: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchBrainStatsNormalized("token", "bucket", "project/brain/", "jsons", { signal });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("prefix=project%2Fbrain%2Fjsons%2F"),
      expect.objectContaining({ cache: "no-store", signal }),
    );
  });
});
