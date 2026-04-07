import "server-only";

import path from "node:path";
import { unstable_cache } from "next/cache";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getConfiguredStorageProvider } from "@/lib/uploads";

const FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".ico"]);
const MAX_PREVIEW_ITEMS = 48;
const MAX_FOLDER_ITEMS = 6;
const DEFAULT_MEDIA_PICKER_PAGE_SIZE = 24;

type R2Env = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  region: string;
};

export type MediaFolderSummary = {
  name: string;
  files: number;
  bytes: number;
};

export type MediaPreviewItem = {
  key: string;
  url: string;
  size: number;
  folder: string;
  extension: string;
  isImage: boolean;
  lastModified: Date | null;
};

export type AdminMediaPickerSortMode = "newest" | "oldest" | "name-asc" | "name-desc";

export type AdminMediaPickerPage = {
  items: MediaPreviewItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AdminMediaOverview =
  | {
      status: "disabled";
      provider: "local" | "supabase" | "r2";
    }
  | {
      status: "misconfigured";
      provider: "r2";
      message: string;
    }
  | {
      status: "ready";
      provider: "r2";
      bucket: string;
      publicUrl: string;
      objectCount: number;
      imageCount: number;
      totalBytes: number;
      remainingFreeBytes: number;
      usagePercent: number;
      lastUploadAt: Date | null;
      folders: MediaFolderSummary[];
      items: MediaPreviewItem[];
    };

type MediaOverviewOptions = {
  previewLimit?: number | null;
};

function trimEnv(name: string) {
  return (process.env[name] || "").trim();
}

function encodeObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function readR2Env() {
  const endpoint = trimEnv("R2_ENDPOINT").replace(/\/+$/, "");
  const accessKeyId = trimEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = trimEnv("R2_SECRET_ACCESS_KEY");
  const publicUrl = trimEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
  const bucket = trimEnv("R2_BUCKET") || "media";
  const region = trimEnv("R2_REGION") || "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey || !publicUrl) {
    return null;
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicUrl,
    bucket,
    region,
  } satisfies R2Env;
}

function createR2Client(env: R2Env) {
  return new S3Client({
    region: env.region,
    endpoint: env.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

function getFolderName(key: string) {
  const parts = key.split("/").filter(Boolean);
  return parts[0] || "root";
}

function getFileExtension(key: string) {
  return path.extname(key).toLowerCase();
}

function isImageKey(key: string) {
  return IMAGE_EXTENSIONS.has(getFileExtension(key));
}

function fileNameFromKey(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

function toTimestamp(value?: Date | string | null) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareMediaItems(
  left: MediaPreviewItem,
  right: MediaPreviewItem,
  sortMode: AdminMediaPickerSortMode,
) {
  if (sortMode === "newest") {
    return toTimestamp(right.lastModified) - toTimestamp(left.lastModified) || left.key.localeCompare(right.key);
  }

  if (sortMode === "oldest") {
    return toTimestamp(left.lastModified) - toTimestamp(right.lastModified) || left.key.localeCompare(right.key);
  }

  const leftName = fileNameFromKey(left.key);
  const rightName = fileNameFromKey(right.key);

  if (sortMode === "name-asc") {
    return leftName.localeCompare(rightName) || left.key.localeCompare(right.key);
  }

  return rightName.localeCompare(leftName) || left.key.localeCompare(right.key);
}

export function getFreeTierBytes() {
  return FREE_TIER_BYTES;
}

export async function getAdminMediaOverview(
  options: MediaOverviewOptions = {},
): Promise<AdminMediaOverview> {
  const previewLimit =
    options.previewLimit === undefined ? MAX_PREVIEW_ITEMS : options.previewLimit;

  try {
    const provider = getConfiguredStorageProvider();
    if (provider !== "r2") {
      return { status: "disabled", provider };
    }
  } catch (error) {
    return {
      status: "misconfigured",
      provider: "r2",
      message: error instanceof Error ? error.message : "Cloudflare R2 is not configured correctly.",
    };
  }

  const env = readR2Env();
  if (!env) {
    return {
      status: "misconfigured",
      provider: "r2",
      message: "Cloudflare R2 env is incomplete. Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.",
    };
  }

  const client = createR2Client(env);
  const items: MediaPreviewItem[] = [];
  const folderTotals = new Map<string, MediaFolderSummary>();
  let continuationToken: string | undefined;
  let totalBytes = 0;
  let objectCount = 0;
  let imageCount = 0;

  try {
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: env.bucket,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key) continue;

        const size = object.Size ?? 0;
        const folder = getFolderName(object.Key);
        const isImage = isImageKey(object.Key);
        items.push({
          key: object.Key,
          url: `${env.publicUrl}/${encodeObjectPath(object.Key)}`,
          size,
          folder,
          extension: getFileExtension(object.Key),
          isImage,
          lastModified: object.LastModified ?? null,
        });

        totalBytes += size;
        objectCount += 1;
        if (isImage) imageCount += 1;

        const current = folderTotals.get(folder) ?? { name: folder, files: 0, bytes: 0 };
        current.files += 1;
        current.bytes += size;
        folderTotals.set(folder, current);
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (error) {
    return {
      status: "misconfigured",
      provider: "r2",
      message: error instanceof Error ? error.message : "Could not read Cloudflare R2 bucket contents.",
    };
  }

  items.sort((a, b) => {
    const aTime = a.lastModified?.getTime() ?? 0;
    const bTime = b.lastModified?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.key.localeCompare(b.key);
  });

  const remainingFreeBytes = Math.max(0, FREE_TIER_BYTES - totalBytes);
  const usagePercent = totalBytes <= 0 ? 0 : Math.min(100, (totalBytes / FREE_TIER_BYTES) * 100);

  return {
    status: "ready",
    provider: "r2",
    bucket: env.bucket,
    publicUrl: env.publicUrl,
    objectCount,
    imageCount,
    totalBytes,
    remainingFreeBytes,
    usagePercent,
    lastUploadAt: items[0]?.lastModified ?? null,
    folders: [...folderTotals.values()]
      .sort((a, b) => {
        if (b.bytes !== a.bytes) return b.bytes - a.bytes;
        if (b.files !== a.files) return b.files - a.files;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_FOLDER_ITEMS),
    items:
      previewLimit === null
        ? items.filter((item) => item.isImage)
        : items.filter((item) => item.isImage).slice(0, previewLimit),
  };
}

export async function getAdminMediaPickerItems(limit: number | null = null): Promise<MediaPreviewItem[]> {
  const overview = await getAdminMediaOverview({ previewLimit: limit });
  return overview.status === "ready" ? overview.items : [];
}

export const getCachedAdminMediaOverview = unstable_cache(
  async () => getAdminMediaOverview({ previewLimit: null }),
  ["admin-media-overview"],
  { revalidate: 120, tags: ["admin-media"] },
);

export async function getCachedAdminMediaPickerItems() {
  const overview = await getCachedAdminMediaOverview();
  return overview.status === "ready" ? overview.items : [];
}

export async function getCachedAdminMediaPickerPage({
  page = 1,
  pageSize = DEFAULT_MEDIA_PICKER_PAGE_SIZE,
  query = "",
  sort = "newest",
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: AdminMediaPickerSortMode;
} = {}): Promise<AdminMediaPickerPage> {
  const items = await getCachedAdminMediaPickerItems();
  const normalizedQuery = query.trim().toLowerCase();
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(60, Math.max(1, Math.floor(pageSize)))
    : DEFAULT_MEDIA_PICKER_PAGE_SIZE;

  const filteredItems = !normalizedQuery
    ? items
    : items.filter((item) => {
        const key = item.key.toLowerCase();
        const folder = item.folder.toLowerCase();
        const fileName = fileNameFromKey(item.key).toLowerCase();
        return (
          key.includes(normalizedQuery) ||
          folder.includes(normalizedQuery) ||
          fileName.includes(normalizedQuery)
        );
      });

  const sortedItems =
    sort === "newest" ? filteredItems : [...filteredItems].sort((left, right) => compareMediaItems(left, right, sort));

  const start = (safePage - 1) * safePageSize;
  const pageItems = sortedItems.slice(start, start + safePageSize);

  return {
    items: pageItems,
    total: sortedItems.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: start + safePageSize < sortedItems.length,
  };
}
