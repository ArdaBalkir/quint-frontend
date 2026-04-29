/**
 * Merges a desktop alignment file (QuickNII / VisuAlign JSON with `slices`)
 * into a web alignment file (WebAlign / WebWarp / LocaliZoom JSON with `sections`).
 *
 * Sections are matched by the `_sXXXXX` suffix in their filenames.
 *
 * @param {object} src - Desktop alignment object (must have a `slices` array)
 * @param {object} dst - Web alignment object (must have a `sections` array)
 * @returns {object} A deep-cloned `dst` with `ouv` / `markers` fields merged in
 * @throws {string} If a destination section has no `_s` suffix or a duplicate is found
 */
function desktopToWeb(src, dst) {
    dst = structuredClone(dst);
    const slices = src.slices; // QuickNII-VisuAlign
    const sections = dst.sections; // WebAlign-WebWarp-LocaliZoom
    const checks = new Set();
    const mapped = new Map();
    for (const section of sections) {
        const m = section.filename.match(/.*(_s\d+[a-zA-Z]?)/);
        if (!m) {
            throw "No section number: " + section.filename;
        }
        if (checks.has(m[1])) {
            throw "Duplicate section number: " + section.filename;
        }
        checks.add(m[1]);
        mapped.set(m[1], section);
    }
    for (const slice of slices) {
        const m = slice.filename.match(/.*(_s\d+[a-zA-Z]?)/);
        if (!m || !mapped.has(m[1])) {
            continue;
        }
        const section = mapped.get(m[1]);
        if (slice.anchoring) {
            section.ouv = slice.anchoring;
            section.wadone = true;
        } else {
            delete section.ouv;
            delete section.wadone;
        }
        if (slice.markers) {
            section.wwdone = true;
            section.markers = slice.markers.map((coords) => [
                (coords[0] * section.width) / slice.width,
                (coords[1] * section.height) / slice.height,
                (coords[2] * section.width) / slice.width,
                (coords[3] * section.height) / slice.height,
            ]);
        } else {
            delete section.wwdone;
            delete section.markers;
        }
    }
    return dst;
}

export default desktopToWeb;
