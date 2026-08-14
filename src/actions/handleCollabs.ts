const BUCKET_URL = "https://data-proxy.ebrains.eu/api/v1/buckets/";

type FetchOptions = RequestInit;

const fetchJson = async <T = any>(
  url: string,
  options: FetchOptions = {},
): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

const fetchWithAuth = <T = any>(
  url: string,
  token: string,
  options: FetchOptions = {},
): Promise<T> =>
  fetchJson<T>(url, {
    ...options,
    headers: {
      ...(options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : options.headers || {}),
      Authorization: "Bearer " + token,
      accept: "application/json",
    },
  });

export async function deleteItem(path: string, token: string): Promise<any> {
  return fetchWithAuth(`${BUCKET_URL}${path}`, token, { method: "DELETE" });
}

export async function listAvailableWorkspaces(
  token: string,
): Promise<string[]> {
  const workspaces = await fetchWithAuth<any[]>(BUCKET_URL.slice(0, -1), token);
  return workspaces.map((w) => w.name);
}

export interface AvailableBucket {
  name: string;
  role: string; // 'administrator' | 'editor' | 'viewer'
  is_public: boolean;
}

const canEditBucket = (bucket: AvailableBucket): boolean => {
  const role = bucket.role?.toLowerCase();
  return role === "administrator" || role === "editor";
};

export async function fetchAvailableBuckets(
  token: string,
  search: string = "rwb",
): Promise<AvailableBucket[]> {
  const url = `${BUCKET_URL.slice(0, -1)}?search=${encodeURIComponent(search)}`;
  const buckets = await fetchWithAuth<AvailableBucket[]>(url, token);
  return buckets.filter(canEditBucket);
}

export const fetchCollab = (token: string, collabName: string): Promise<any> =>
  fetchWithAuth(`https://wiki.ebrains.eu/rest/v1/collabs/${collabName}`, token);

export interface BucketDirEntry {
  name: string;
  type: string;
  path: string;
}

export const fetchBucketDir = async (
  token: string,
  bucketName: string,
  prefix?: string,
  delimiter?: string,
  limit: number = 1000,
  opts?: { signal?: AbortSignal },
): Promise<BucketDirEntry[]> => {
  const params = new URLSearchParams();
  if (prefix) params.append("prefix", prefix);
  if (delimiter) params.append("delimiter", delimiter);
  if (limit) params.append("limit", limit.toString());
  const url = `${BUCKET_URL}${bucketName}?${params}`;
  const data = await fetchWithAuth<any>(url, token, { signal: opts?.signal });
  return (data.objects || [])
    .filter((obj: any) => obj.subdir)
    .map((obj: any) => {
      const dirName = obj.subdir.split("/").slice(-2, -1)[0] || obj.subdir;
      return {
        name: dirName,
        type: "directory",
        path: prefix ? `${prefix}${dirName}/` : `${dirName}/`,
      };
    });
};

export function fetchWorkspaceConfigurations(): null {
  return null;
}

interface BucketStats {
  name: string;
  files: number;
  size: number;
  tiffs?: any[];
  zips?: any[];
  jsons?: any[];
  nutil_results?: any[];
}

// Fetch stats for a single subdirectory of a brain (raw_images, zipped_images, etc.)
const fetchSingleBrainSubdir = async (
  token: string,
  bucketName: string,
  brainPrefix: string,
  subdir: string,
  signal?: AbortSignal,
): Promise<BucketStats> => {
  // Special case for nutil_results - use the dedicated function
  if (subdir === "nutil_results") {
    const nutilResults = await fetchnutilResults(
      token,
      bucketName,
      brainPrefix,
      signal,
    );
    return {
      name: brainPrefix + subdir,
      files: nutilResults[0]?.files || 0,
      size: nutilResults[0]?.size || 0,
      nutil_results: nutilResults[0]?.images || [],
    };
  }

  const params = new URLSearchParams();
  if (brainPrefix) params.append("prefix", `${brainPrefix}${subdir}/`);
  params.append("limit", "1000");
  const url = `${BUCKET_URL}${bucketName}?${params}`;
  const data = await fetchWithAuth<any>(url, token, { signal });
  const base: BucketStats = {
    name: brainPrefix + subdir,
    files: data.objects.length,
    size: data.objects.reduce((acc: number, obj: any) => acc + obj.bytes, 0),
  };
  if (subdir === "raw_images") {
    base.tiffs = data.objects.filter((o: any) =>
      /\.(tif|tiff|png|jpe?g)$/i.test(o.name),
    );
  } else if (subdir === "zipped_images") {
    base.zips = data.objects.filter((o: any) => o.name.endsWith(".dzip"));
  } else if (subdir === "jsons") {
    base.jsons = data.objects.filter((o: any) => /\.(json|waln)$/i.test(o.name));
  }
  return base;
};

// Normalized brain stats (phase 2 refactor step) ---------------------------------
export interface BrainStatsNormalized {
  rawImages?: BucketStats; // raw_images
  pyramids?: BucketStats; // zipped_images
  registrations?: BucketStats; // jsons
  segmentations?: BucketStats; // segmentations
  nutil?: BucketStats; // nutil_results
}

export const normalizeBrainStats = (
  stats: BucketStats[],
): BrainStatsNormalized => {
  const normalized: BrainStatsNormalized = {};
  stats.forEach((s) => {
    const name = s.name.toLowerCase();
    if (name.endsWith("raw_images")) normalized.rawImages = s;
    else if (name.endsWith("zipped_images")) normalized.pyramids = s;
    else if (name.endsWith("jsons")) normalized.registrations = s;
    else if (name.endsWith("segmentations")) normalized.segmentations = s;
    else if (name.endsWith("nutil_results")) normalized.nutil = s;
  });
  return normalized;
};

export const fetchBrainStatsNormalized = async (
  token: string,
  bucketName: string,
  brainPrefix: string,
  optional: string | null = null,
  opts?: { signal?: AbortSignal },
): Promise<BrainStatsNormalized> => {
  const subdirs = optional
    ? [optional]
    : [
        "raw_images",
        "zipped_images",
        "jsons",
        "segmentations",
        "nutil_results",
      ];
  const results = await Promise.all(
    subdirs.map((d) =>
      fetchSingleBrainSubdir(token, bucketName, brainPrefix, d, opts?.signal),
    ),
  );
  return normalizeBrainStats(results);
};

export interface BrainSegmentation {
  name: string;
  files: number;
  size: number;
  images: any[];
}

export const fetchBrainSegmentations = async (
  token: string,
  bucketName: string,
  brainPrefix: string,
  opts?: { signal?: AbortSignal },
): Promise<BrainSegmentation[]> => {
  const params = new URLSearchParams();
  if (brainPrefix) params.append("prefix", `${brainPrefix}segmentations/`);
  params.append("limit", "1000");
  const url = `${BUCKET_URL}${bucketName}?${params}`;
  const data = await fetchWithAuth<any>(url, token, { signal: opts?.signal });
  if (!data.objects?.length) return [];
  return [
    {
      name: brainPrefix + "segmentations",
      files: data.objects.length,
      size: data.objects.reduce((acc: number, obj: any) => acc + obj.bytes, 0),
      images: data.objects,
    },
  ];
};

export const fetchnutilResults = async (
  token: string,
  bucketName: string,
  brainPrefix: string,
  signal?: AbortSignal,
  useDelimiter: boolean = true,
): Promise<BrainSegmentation[]> => {
  const params = new URLSearchParams();
  if (brainPrefix) params.append("prefix", `${brainPrefix}nutil_results/`);
  if (useDelimiter) params.append("delimiter", "/");
  params.append("limit", "1000");

  const url = `${BUCKET_URL}${bucketName}?${params.toString()}`;
  const data = await fetchWithAuth<any>(url, token, { signal });

  if (useDelimiter) {
    // When using delimiter, filter for subdirectories like fetchBucketDir does
    const subdirs = (data.objects || []).filter((obj: any) => obj.subdir);

    if (!subdirs.length) return [];
    return [
      {
        name: brainPrefix + "nutil_results",
        files: subdirs.length,
        size: subdirs.reduce(
          (acc: number, obj: any) => acc + (obj.bytes || 0),
          0,
        ),
        images: subdirs,
      },
    ];
  } else {
    // Without delimiter, return all objects
    if (!data.objects?.length) return [];
    return [
      {
        name: brainPrefix + "nutil_results",
        files: data.objects.length,
        size: data.objects.reduce(
          (acc: number, obj: any) => acc + obj.bytes,
          0,
        ),
        images: data.objects,
      },
    ];
  }
};

const getUploadUrl = async (
  token: string,
  bucketName: string,
  objectName: string,
): Promise<string> => {
  const url = `${BUCKET_URL}${bucketName}/${objectName}`;
  const result = await fetchWithAuth<{ url: string }>(url, token, {
    method: "PUT",
    headers: { Accept: "application/json" },
  });
  return result.url;
};

const uploadFile = async (
  uploadUrl: string,
  file: Blob | string,
  contentType?: string,
): Promise<{ url: string; status: boolean }> => {
  const headers: Record<string, string> = contentType
    ? { "Content-Type": contentType }
    : {};
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers,
  });
  if (!response.ok) throw new Error("Failed to upload file");
  return { url: uploadUrl, status: response.status === 204 };
};

// Upload file with progress callback using XMLHttpRequest
const uploadFileWithProgress = (
  uploadUrl: string,
  file: Blob,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ url: string; status: boolean }> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: uploadUrl, status: xhr.status === 204 });
      } else {
        reject(new Error(`Failed to upload file: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.send(file);
  });
};

export const uploadToPath = async (
  token: string,
  bucketName: string,
  projectName: string,
  uploadPath: string,
  file: File,
): Promise<{ url: string; status: boolean }> => {
  const objectName = `${projectName}/${uploadPath}${file.name}`.replace(
    /\/+/g,
    "/",
  );
  const uploadUrl = await getUploadUrl(token, bucketName, objectName);
  return uploadFile(uploadUrl, file);
};

export const uploadToPathWithProgress = async (
  token: string,
  bucketName: string,
  projectName: string,
  uploadPath: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ url: string; status: boolean }> => {
  const objectName = `${projectName}/${uploadPath}${file.name}`.replace(
    /\/+/g,
    "/",
  );
  const uploadUrl = await getUploadUrl(token, bucketName, objectName);
  return uploadFileWithProgress(uploadUrl, file, onProgress);
};

interface CreateProjectUploadObj {
  token: string;
  bucketName: string;
  projectName: string;
}

export const createProject = async (
  uploadObj: CreateProjectUploadObj,
): Promise<{ url: string; status: boolean }> => {
  const objectName = `${uploadObj.projectName}/projectsettings.json`.replace(
    /\/+/g,
    "/",
  );
  const uploadUrl = await getUploadUrl(
    uploadObj.token,
    uploadObj.bucketName,
    objectName,
  );
  const content = {
    created_at: new Date().toISOString(),
    project_name: uploadObj.projectName,
  };
  return uploadFile(uploadUrl, JSON.stringify(content), "application/json");
};

export const uploadToSegments = async (
  token: string,
  bucketName: string,
  projectName: string,
  brainName: string,
  file: File,
): Promise<{ url: string; status: boolean }> => {
  const objectName =
    `${projectName}/${brainName}/segmentations/${file.name}`.replace(
      /\/+/g,
      "/",
    );
  const uploadUrl = await getUploadUrl(token, bucketName, objectName);
  return uploadFile(uploadUrl, file);
};

export const uploadToJson = async (
  uploadObj: CreateProjectUploadObj & { brainName: string },
  fileName: string,
  content: any,
): Promise<{ url: string; status: boolean }> => {
  const objectName =
    `${uploadObj.projectName}/${uploadObj.brainName}/jsons/${fileName}`.replace(
      /\/+/g,
      "/",
    );
  const uploadUrl = await getUploadUrl(
    uploadObj.token,
    uploadObj.bucketName,
    objectName,
  );
  return uploadFile(uploadUrl, JSON.stringify(content), "application/json");
};

export async function checkBucketExists(
  token: string,
  searchTerm: string,
): Promise<boolean> {
  try {
    const url = `${BUCKET_URL.slice(0, -1)}?search=${searchTerm}`;
    const data = await fetchWithAuth<any[]>(url, token);
    return data && data.length > 0;
  } catch {
    return false;
  }
}

export const downloadWalnJson = async (
  token: string,
  bucketName: string,
  objectPath: string,
  signal?: AbortSignal,
): Promise<any> => {
  const url = `${BUCKET_URL}${bucketName}/${objectPath}?redirect=false`;
  const { url: downloadUrl } = await fetchWithAuth<{ url: string }>(
    url,
    token,
    { signal },
  );
  const contentResponse = await fetch(downloadUrl, { signal });
  if (!contentResponse.ok) throw new Error("Failed to download WALN content");
  return contentResponse.json();
};
