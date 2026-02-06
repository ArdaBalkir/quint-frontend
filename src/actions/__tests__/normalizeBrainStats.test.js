// Lightweight test-style script for normalizeBrainStats; run manually with node if desired.
import { normalizeBrainStats } from '../brainStatsUtils.js';

const sample = [
    { name: 'proj/brain/raw_images', files: 3, size: 100, tiffs: [{ name: 'a.tif' }, { name: 'b.tif' }] },
    { name: 'proj/brain/zipped_images', files: 2, size: 50, zips: [{ name: 'a.tif.dzip' }] },
    { name: 'proj/brain/jsons', files: 1, size: 10, jsons: [{ name: 'reg.waln' }] },
    { name: 'proj/brain/segmentations', files: 0, size: 0 },
    { name: 'proj/brain/nutil_results', files: 0, size: 0, nutil_results: [] },
];

const normalized = normalizeBrainStats(sample);
console.log('Normalized keys:', Object.keys(normalized));
console.assert(normalized.rawImages?.tiffs?.length === 2, 'rawImages missing');
console.assert(normalized.pyramids?.zips?.length === 1, 'pyramids missing');
console.assert(normalized.registrations?.jsons?.length === 1, 'registrations missing');
console.assert(normalized.segmentations?.files === 0, 'segmentations missing');
console.assert(normalized.nutil?.files === 0, 'nutil missing');
console.log('All assertions passed.');
