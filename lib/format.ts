import { format } from "date-fns";

function normalizeDate(dt: Date | string | number | null | undefined) {
  if (dt == null || dt === "") return null;
  const value = dt instanceof Date ? dt : new Date(dt);
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

export function formatDateTime(dt: Date | string | number | null | undefined) {
  const value = normalizeDate(dt);
  if (!value) return "";
  return format(value, "dd.MM.yyyy HH:mm");
}

export function formatDate(dt: Date | string | number | null | undefined) {
  const value = normalizeDate(dt);
  if (!value) return "";
  return format(value, "dd.MM.yyyy");
}

export function readingTime(html: string | null | undefined): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter((w) => w.length > 0).length;
  const minutes = Math.max(1, Math.round(words / 200));
  if (minutes === 1) return "1 мин чтения";
  if (minutes < 5) return `${minutes} мин чтения`;
  return `${minutes} мин чтения`;
}
