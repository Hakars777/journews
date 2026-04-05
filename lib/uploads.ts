import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2560;
const PASSTHROUGH_MAX_BYTES = 3 * 1024 * 1024;
const PHOTO_WEBP_QUALITY = 88;
const GRAPHIC_WEBP_QUALITY = 92;
const MIN_RECOMPRESS_SAVINGS_RATIO = 0.92;
const DEFAULT_BUCKET = "media";
const DEFAULT_R2_REGION = "auto";
const STORAGE_PROVIDERS = new Set(["local", "supabase", "r2"]);

type StorageProvider = "local" | "supabase" | "r2";

type SupabaseEnv = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

type R2Env = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  region: string;
};

const globalForStorage = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient;
  r2Client?: S3Client;
};

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  return ext;
}

function safeFolder(folder: string) {
  return folder.replace(/[^a-z0-9/_-]+/gi, "-").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "") || "misc";
}

function trimEnv(name: string) {
  return (process.env[name] || "").trim();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function encodeObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function ymParts(d: Date) {
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return { y, m };
}

function localYmPath(d: Date) {
  const { y, m } = ymParts(d);
  return { y, m, dir: path.join(UPLOAD_ROOT, y, m), urlPrefix: `/uploads/${y}/${m}` };
}

function readSupabaseEnv() {
  const url = trimEnv("SUPABASE_URL") || trimEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = trimEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucketEnv = trimEnv("SUPABASE_STORAGE_BUCKET");
  const hasAny = !!url || !!serviceRoleKey || !!bucketEnv;
  const isComplete = !!url && !!serviceRoleKey;

  if (!isComplete) {
    return { hasAny, isComplete, env: null as SupabaseEnv | null };
  }

  return {
    hasAny,
    isComplete,
    env: {
      url: url.replace(/\/+$/, ""),
      serviceRoleKey,
      bucket: bucketEnv || DEFAULT_BUCKET,
    } satisfies SupabaseEnv,
  };
}

function readR2Env() {
  const endpoint = trimEnv("R2_ENDPOINT");
  const accessKeyId = trimEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = trimEnv("R2_SECRET_ACCESS_KEY");
  const bucketEnv = trimEnv("R2_BUCKET");
  const publicUrl = trimEnv("R2_PUBLIC_URL");
  const hasAny = !!endpoint || !!accessKeyId || !!secretAccessKey || !!bucketEnv || !!publicUrl;
  const isComplete = !!endpoint && !!accessKeyId && !!secretAccessKey && !!publicUrl;

  if (!isComplete) {
    return { hasAny, isComplete, env: null as R2Env | null };
  }

  return {
    hasAny,
    isComplete,
    env: {
      endpoint: endpoint.replace(/\/+$/, ""),
      accessKeyId,
      secretAccessKey,
      bucket: bucketEnv || DEFAULT_BUCKET,
      publicUrl: publicUrl.replace(/\/+$/, ""),
      region: trimEnv("R2_REGION") || DEFAULT_R2_REGION,
    } satisfies R2Env,
  };
}

export function getConfiguredStorageProvider(): StorageProvider {
  const explicit = trimEnv("MEDIA_STORAGE_PROVIDER").toLowerCase();
  const supabase = readSupabaseEnv();
  const r2 = readR2Env();

  if (explicit) {
    if (!STORAGE_PROVIDERS.has(explicit)) {
      throw new Error("MEDIA_STORAGE_PROVIDER must be one of: local, supabase, r2.");
    }

    if (explicit === "supabase" && !supabase.isComplete) {
      throw new Error("Supabase Storage env is incomplete. Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    if (explicit === "r2" && !r2.isComplete) {
      throw new Error(
        "Cloudflare R2 env is incomplete. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.",
      );
    }

    return explicit as StorageProvider;
  }

  if (r2.hasAny && !r2.isComplete) {
    throw new Error(
      "Cloudflare R2 env is incomplete. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL.",
    );
  }

  if (supabase.hasAny && !supabase.isComplete) {
    throw new Error("Supabase Storage env is incomplete. Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (r2.isComplete) return "r2";
  if (supabase.isComplete) return "supabase";
  return "local";
}

function getSupabaseEnv() {
  return readSupabaseEnv().env;
}

function getR2Env() {
  return readR2Env().env;
}

function getSupabaseAdmin() {
  const env = getSupabaseEnv();
  if (!env) return null;

  globalForStorage.supabaseAdmin ??= createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return globalForStorage.supabaseAdmin;
}

function getPublicBucketPrefix() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return `${env.url}/storage/v1/object/public/${env.bucket}/`;
}

function getR2Client() {
  const env = getR2Env();
  if (!env) return null;

  globalForStorage.r2Client ??= new S3Client({
    region: env.region,
    endpoint: env.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  return globalForStorage.r2Client;
}

function getR2PublicPrefix() {
  const env = getR2Env();
  if (!env) return null;
  return ensureTrailingSlash(env.publicUrl);
}

function getMimeType(ext: string, fileType?: string) {
  if (fileType) return fileType;
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function saveLocalImageUpload(file: File) {
  const ext = safeExt(file.name);
  if (!ext) throw new Error("Unsupported image type. Allowed: jpg, png, webp, gif.");

  const d = new Date();
  const { dir, urlPrefix } = localYmPath(d);
  await fs.mkdir(dir, { recursive: true });

  const name = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const absPath = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buf);

  return `${urlPrefix}/${name}`;
}

async function saveSupabaseImageUpload(file: File, folder: string) {
  const ext = safeExt(file.name);
  if (!ext) throw new Error("Unsupported image type. Allowed: jpg, png, webp, gif.");

  const env = getSupabaseEnv();
  const supabase = getSupabaseAdmin();
  if (!env || !supabase) throw new Error("Supabase Storage is not configured.");

  const { y, m } = ymParts(new Date());
  const objectPath = `${safeFolder(folder)}/${y}/${m}/${crypto.randomBytes(16).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(env.bucket).upload(objectPath, buffer, {
    contentType: getMimeType(ext, file.type),
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(env.bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function saveR2ImageUpload(file: File, folder: string) {
  const ext = safeExt(file.name);
  if (!ext) throw new Error("Unsupported image type. Allowed: jpg, png, webp, gif.");

  const env = getR2Env();
  const r2 = getR2Client();
  if (!env || !r2) throw new Error("Cloudflare R2 is not configured.");

  const { y, m } = ymParts(new Date());
  const objectPath = `${safeFolder(folder)}/${y}/${m}/${crypto.randomBytes(16).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: objectPath,
      Body: buffer,
      ContentType: getMimeType(ext, file.type),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${env.publicUrl}/${encodeObjectPath(objectPath)}`;
}

async function deleteLocalUploadIfInsidePublicUploads(publicPath: string) {
  if (!publicPath.startsWith("/uploads/")) return;

  const rel = publicPath.replace(/^\/uploads\//, "");
  const abs = path.join(UPLOAD_ROOT, rel);
  const normalized = path.normalize(abs);
  if (!normalized.startsWith(path.normalize(UPLOAD_ROOT))) return;

  try {
    await fs.unlink(normalized);
  } catch {
    // ignore missing files
  }
}

function getSupabaseObjectPath(publicPath: string) {
  const prefix = getPublicBucketPrefix();
  if (!prefix || !publicPath.startsWith(prefix)) return null;
  const raw = publicPath.slice(prefix.length).split(/[?#]/, 1)[0];
  return raw ? decodeURIComponent(raw) : null;
}

function getR2ObjectPath(publicPath: string) {
  const prefix = getR2PublicPrefix();
  if (!prefix || !publicPath.startsWith(prefix)) return null;
  const raw = publicPath.slice(prefix.length).split(/[?#]/, 1)[0];
  return raw ? decodeURIComponent(raw) : null;
}

async function deleteSupabaseObject(publicPath: string) {
  const env = getSupabaseEnv();
  const supabase = getSupabaseAdmin();
  const objectPath = getSupabaseObjectPath(publicPath);
  if (!env || !supabase || !objectPath) return false;

  const { error } = await supabase.storage.from(env.bucket).remove([objectPath]);
  if (error) {
    return false;
  }
  return true;
}

async function deleteR2Object(publicPath: string) {
  const env = getR2Env();
  const r2 = getR2Client();
  const objectPath = getR2ObjectPath(publicPath);
  if (!env || !r2 || !objectPath) return false;

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: env.bucket,
        Key: objectPath,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function isAbsoluteUrl(value: string | null | undefined) {
  return !!value && /^https?:\/\//i.test(value);
}

export function normalizeSelectedMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) return trimmed;
  return null;
}

export function toAbsoluteMediaUrl(value: string | null | undefined, baseUrl: string) {
  if (!value) return undefined;
  if (isAbsoluteUrl(value)) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

async function compressImage(file: File): Promise<{ buffer: Buffer; ext: string; mime: string }> {
  const ext = path.extname(file.name).toLowerCase();
  const originalExt = safeExt(file.name);
  const input = Buffer.from(await file.arrayBuffer());

  // GIF stays as-is so animated images do not break during compression.
  if (ext === ".gif") {
    return { buffer: input, ext: ".gif", mime: "image/gif" };
  }

  const metadata = await sharp(input).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;

  if (originalExt && !needsResize && input.byteLength <= PASSTHROUGH_MAX_BYTES) {
    return {
      buffer: input,
      ext: originalExt,
      mime: getMimeType(originalExt, file.type),
    };
  }

  const transformer = sharp(input)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true });

  const isGraphic = ext === ".png" || metadata.hasAlpha === true;
  const buffer = await (isGraphic
    ? transformer.webp({
        quality: GRAPHIC_WEBP_QUALITY,
        nearLossless: true,
        alphaQuality: 100,
        effort: 6,
      })
    : transformer.webp({
        quality: PHOTO_WEBP_QUALITY,
        smartSubsample: true,
        effort: 5,
      })
  ).toBuffer();

  if (
    originalExt &&
    !needsResize &&
    buffer.byteLength >= Math.round(input.byteLength * MIN_RECOMPRESS_SAVINGS_RATIO)
  ) {
    return {
      buffer: input,
      ext: originalExt,
      mime: getMimeType(originalExt, file.type),
    };
  }

  return { buffer, ext: ".webp", mime: "image/webp" };
}

export async function saveImageUpload(file: File, folder = "news") {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 10MB).");

  const { buffer, ext, mime } = await compressImage(file);
  const compressed = new File([new Uint8Array(buffer)], `upload${ext}`, { type: mime });
  const provider = getConfiguredStorageProvider();

  switch (provider) {
    case "r2":
      return saveR2ImageUpload(compressed, folder);
    case "supabase":
      return saveSupabaseImageUpload(compressed, folder);
    default:
      return saveLocalImageUpload(compressed);
  }
}

export async function deleteUploadedImage(publicPath: string) {
  if (!publicPath) return;
  const deletedFromR2 = await deleteR2Object(publicPath);
  if (deletedFromR2) return;
  const deletedFromSupabase = await deleteSupabaseObject(publicPath);
  if (deletedFromSupabase) return;
  await deleteLocalUploadIfInsidePublicUploads(publicPath);
}

export async function deleteUploadIfInsidePublicUploads(publicPath: string) {
  await deleteUploadedImage(publicPath);
}
