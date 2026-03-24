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
