export const SECTION_NAMING_HELP =
  "Use _s + 1–4 digits before the extension (e.g. brain_s01.tif). Numbers must be unique regardless of leading zeros; gaps are allowed.";

export function getSectionNumber(name) {
  const filename = name.split(/[\\/]/).pop();
  const match = filename.match(/_s([0-9]{1,4})\.[a-zA-Z0-9]+(?:\.dzip)?$/);
  // Earlier section identifiers would make downstream matching ambiguous.
  if (!match || /_s[0-9]/.test(filename.slice(0, match.index))) return null;
  return Number(match[1]);
}

// Return an error for every affected row, including both sides of a duplicate.
export function validateSectionNames(names, existingNames = []) {
  const counts = new Map();
  for (const name of [...existingNames, ...names]) {
    const number = getSectionNumber(name);
    if (number !== null) counts.set(number, (counts.get(number) || 0) + 1);
  }
  return names.map((name) => {
    const number = getSectionNumber(name);
    if (number === null) return "Use _s followed by 1–4 digits immediately before the extension.";
    if (counts.get(number) > 1) return `Section ${number} is used by more than one file.`;
    return null;
  });
}
