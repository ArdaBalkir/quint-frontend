// Core workspace interfaces based on actual usage
export interface ProjectEntry {
  name: string;
  type: string;
  path: string;
}

export interface BrainEntry {
  id: number;
  name: string;
  type: string;
  path: string;
}

export interface BrainStatsNormalized {
  rawImages?: BucketStats;
  pyramids?: BucketStats;
  registrations?: BucketStats;
  segmentations?: BucketStats;
  pynutil?: BucketStats;
}

export interface BucketStats {
  name: string;
  files: number;
  size: number;
  tiffs?: any[];
  zips?: any[];
  jsons?: any[];
  nutil_results?: any[];
}

export interface User {
  username: string;
  [key: string]: any;
}

export interface RegistrationInfo {
  atlas: string | null;
  last_modified: string | null;
  alignment_json_path?: string | null;
}
