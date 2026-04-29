import { describe, it, expect } from "vitest";
import {
  normalizeBrainStats,
  type BrainStatsNormalized,
} from "../handleCollabs.ts";

interface BucketStats {
  name: string;
  files: number;
  size: number;
  tiffs?: any[];
  zips?: any[];
  jsons?: any[];
}

describe("normalizeBrainStats", () => {
  it("maps each directory bucket to correct key", () => {
    const sample: any[] = [
      {
        name: "proj/brain/raw_images",
        files: 3,
        size: 100,
        tiffs: [{ name: "a.tif" }, { name: "b.tif" }],
      },
      {
        name: "proj/brain/zipped_images",
        files: 2,
        size: 50,
        zips: [{ name: "a.tif.dzip" }],
      },
      {
        name: "proj/brain/jsons",
        files: 1,
        size: 10,
        jsons: [{ name: "reg.waln" }],
      },
      { name: "proj/brain/segmentations", files: 0, size: 0 },
      { name: "proj/brain/nutil_results", files: 0, size: 0 },
    ];
    const normalized: BrainStatsNormalized = normalizeBrainStats(sample as any);
    expect(normalized.rawImages?.tiffs?.length).toBe(2);
    expect(normalized.pyramids?.zips?.length).toBe(1);
    expect(normalized.registrations?.jsons?.length).toBe(1);
    expect(normalized.segmentations?.files).toBe(0);
    expect(normalized.nutil?.files).toBe(0);
  });

  it("returns empty object for invalid input", () => {
    const normalized = normalizeBrainStats([]);
    expect(Object.keys(normalized).length).toBe(0);
  });
});
