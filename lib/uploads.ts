import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_BUCKET = "media";

const globalForStorage = globalThis as unknown as { supabaseAdmin?: SupabaseClient };

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  return ext;
}

function safeFolder(folder: string) {
  return folder.replace(/[^a-z0-9/_-]+/gi, "-").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "") || "misc";
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

function getSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url && !serviceRoleKey) return null;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage env is incomplete. Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
    bucket: (process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET,
  };
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

export function isAbsoluteUrl(value: string | null | undefined) {
  return !!value && /^https?:\/\//i.test(value);
}

export function toAbsoluteMediaUrl(value: string | null | undefined, baseUrl: string) {
  if (!value) return undefined;
  if (isAbsoluteUrl(value)) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export async function saveImageUpload(file: File, folder = "news") {
  if (!file || file.size <= 0) return null;
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 10MB).");

  return getSupabaseEnv()
    ? saveSupabaseImageUpload(file, folder)
    : saveLocalImageUpload(file);
}

export async function deleteUploadedImage(publicPath: string) {
  if (!publicPath) return;
  const deleted = await deleteSupabaseObject(publicPath);
  if (deleted) return;
  await deleteLocalUploadIfInsidePublicUploads(publicPath);
}

export async function deleteUploadIfInsidePublicUploads(publicPath: string) {
  await deleteUploadedImage(publicPath);
}