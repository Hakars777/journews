import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SITE_NAME = "Jour News";
export const SITE_DESCRIPTION = "Jour News — новостной сайт.";

export function getBaseUrl() {
  const envUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const getSiteSettings = unstable_cache(
  async () => {
    const rows = await prisma.siteSetting
      .findMany({ where: { key: { in: ["site_name", "site_description"] } } })
      .catch(() => []);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: map["site_name"] || SITE_NAME,
      description: map["site_description"] || SITE_DESCRIPTION,
    };
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] },
);

