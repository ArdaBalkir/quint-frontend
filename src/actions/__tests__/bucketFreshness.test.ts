import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBucketJson, downloadWalnJson, fetchBrainStatsNormalized } from "../handleCollabs";

afterEach(() => vi.unstubAllGlobals());

describe("bucket data freshness", () => {
  it("checks all raw image pages so later section conflicts are not missed", async () => {
    const objects = Array.from({ length: 1000 }, (_, i) => ({
      name: `project/brain/raw_images/image_s${String(i).padStart(4, "0")}.tif`, bytes: 1,
    }));
    const lastImage = { name: "project/brain/raw_images/later_s0021.tif", bytes: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ objects: [lastImage] }) });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await fetchBrainStatsNormalized("token", "bucket", "project/brain/", "raw_images");
    expect(stats.rawImages?.tiffs).toHaveLength(1001);
    expect(stats.rawImages?.tiffs?.[1000]).toEqual(lastImage);
    expect(stats.rawImages?.size).toBe(1002);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("marker")).toBe(objects[999].name);
  });

  it("fails closed if the service repeats a full page", async () => {
    const objects = Array.from({ length: 1000 }, (_, i) => ({ name: `image_s${i}.tif`, bytes: 1 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ objects }) }));
    await expect(fetchBrainStatsNormalized("token", "bucket", "project/brain/", "raw_images"))
      .rejects.toThrow("complete image list");
  });

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
