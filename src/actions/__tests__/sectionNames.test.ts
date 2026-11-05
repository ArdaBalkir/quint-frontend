import { describe, expect, it } from "vitest";
import { getSectionNumber, validateSectionNames } from "../../utils/sectionNames.js";

describe("series section names", () => {
  it.each([
    ["brain_s0.tif", 0],
    ["brain_s01.tiff", 1],
    ["brain_s021.png", 21],
    ["brain_s9999.JPG", 9999],
    ["brain_s0000.jpeg", 0],
    ["brain_s0021.tif.dzip", 21],
    ["project_s12/series/brain_s03.tif", 3],
    ["C:\\images\\brain_s04.tif", 4],
  ])("extracts the number from %s", (name, number) => {
    expect(getSectionNumber(name)).toBe(number);
  });

  it.each([
    "brain.tif", "brain_s.tif", "brain_s12345.tif", "brain_s-1.tif",
    "brain_s1.5.tif", "brain_s21a.tif", "brain_s21_extra.tif",
    "brain_S21.tif", "brain_s21", "brain_s21.tif.bak", "brain_s1_s2.tif",
  ])("rejects malformed or ambiguous names: %s", (name) => {
    expect(getSectionNumber(name)).toBeNull();
    expect(validateSectionNames([name])[0]).toBeTruthy();
  });

  it("allows sequential numbers, gaps, and unordered selections", () => {
    expect(validateSectionNames(["a_s03.tif", "b_s01.tif", "c_s02.tif", "d_s9999.tif"]))
      .toEqual([null, null, null, null]);
  });

  it("flags every overlapping number regardless of prefix, extension, or padding", () => {
    expect(validateSectionNames(["a_s21.tif", "b_s0021.png", "c_s021.jpg", "d_s22.tif"]))
      .toEqual([expect.stringContaining("21"), expect.stringContaining("21"), expect.stringContaining("21"), null]);
    expect(validateSectionNames(["a_s0.tif", "b_s0000.tif"]).every(Boolean)).toBe(true);
  });

  it("checks existing series images and prevents overwriting the same filename", () => {
    expect(validateSectionNames(["new_s21.tif", "same_s01.tif", "new_s03.tif"],
      ["project/brain/raw_images/old_s0021.tif", "same_s01.tif"]))
      .toEqual([expect.stringContaining("21"), expect.stringContaining("1"), null]);
  });

  it("clears the overlap when a conflicting selection is removed", () => {
    const names = ["a_s21.tif", "b_s0021.tif"];
    expect(validateSectionNames(names).every(Boolean)).toBe(true);
    expect(validateSectionNames(names.slice(0, 1))).toEqual([null]);
    expect(validateSectionNames([])).toEqual([]);
  });
});
