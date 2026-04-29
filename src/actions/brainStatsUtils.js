// Plain JavaScript version of normalizeBrainStats for direct Node execution.
// Mirrors logic in handleCollabs.ts (source of truth). Keep them in sync.

/**
 * @param {Array<{name:string}>} stats
 * @returns {{rawImages?:object, pyramids?:object, registrations?:object, segmentations?:object, nutil?:object}}
 */
export function normalizeBrainStats(stats) {
    const normalized = {};
    if (!Array.isArray(stats)) return normalized;
    stats.forEach((s) => {
        const name = (s.name || '').toLowerCase();
        if (name.endsWith('raw_images')) normalized.rawImages = s;
        else if (name.endsWith('zipped_images')) normalized.pyramids = s;
        else if (name.endsWith('jsons')) normalized.registrations = s;
        else if (name.endsWith('segmentations')) normalized.segmentations = s;
        else if (name.endsWith('nutil_results')) normalized.nutil = s;
    });
    return normalized;
}
