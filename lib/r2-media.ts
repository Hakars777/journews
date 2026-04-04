import "server-only";

import path from "node:path";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getConfiguredStorageProvider } from "@/lib/uploads";

const FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".ico"]);
const MAX_PREVIEW_ITEMS = 48;
const MAX_FOLDER_ITEMS = 6;

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

export function getFreeTierBytes() {
  return FREE_TIER_BYTES;
}

export async function getAdminMediaOverview(): Promise<AdminMediaOverview> {
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
    items: items.filter((item) => item.isImage).slice(0, MAX_PREVIEW_ITEMS),
  };
}
