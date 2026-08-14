import { describe, expect, it } from "vitest";
import { getRegistrationQuantificationSummary } from "../../utils/registrationQuantification.js";

describe("getRegistrationQuantificationSummary", () => {
  it("counts sections with OUV or marker data as quantifiable", () => {
    expect(
      getRegistrationQuantificationSummary({
        sections: [
          { filename: "aligned.dzip", ouv: [1, 2, 3] },
          { filename: "warped.dzip", markers: [[1, 2, 3, 4]] },
          { filename: "unregistered.dzip", ouv: [], markers: [] },
        ],
      }),
    ).toEqual({
      totalImages: 3,
      quantifiableImages: 2,
      missingRegistrationImages: 1,
    });
  });

  it("supports desktop JSON registrations that use slices and anchoring", () => {
    expect(
      getRegistrationQuantificationSummary({
        slices: [{ anchoring: [1, 2, 3] }, { anchoring: null }],
      }),
    ).toEqual({
      totalImages: 2,
      quantifiableImages: 1,
      missingRegistrationImages: 1,
    });
  });

  it("returns zero counts for content without sections or slices", () => {
    expect(getRegistrationQuantificationSummary({})).toEqual({
      totalImages: 0,
      quantifiableImages: 0,
      missingRegistrationImages: 0,
    });
  });
});
