import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SITE_NAME = "Jour News";
export const SITE_DESCRIPTION = "Jour News — новостной сайт.";
export const MOBILE_ARTICLE_TITLE_SCALE = 90;
export const TICKER_LABEL = "Срочно";
export const TICKER_SPEED_SECONDS = 60;

function parseMobileArticleTitleScale(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MOBILE_ARTICLE_TITLE_SCALE;
  return Math.max(70, Math.min(100, Math.round(parsed)));
}

function parseTickerSpeedSeconds(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return TICKER_SPEED_SECONDS;
  return Math.max(20, Math.min(120, Math.round(parsed)));
}

export function getBaseUrl() {
  const envUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const getSiteSettings = unstable_cache(
  async () => {
    const rows = await prisma.siteSetting
      .findMany({
        where: {
          key: {
            in: [
              "site_name",
              "site_description",
              "mobile_article_title_scale",
              "ticker_label",
              "ticker_speed_seconds",
            ],
          },
        },
      })
      .catch(() => []);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: map["site_name"] || SITE_NAME,
      description: map["site_description"] || SITE_DESCRIPTION,
      mobileArticleTitleScale: parseMobileArticleTitleScale(map["mobile_article_title_scale"]),
      tickerLabel: (map["ticker_label"] || TICKER_LABEL).trim() || TICKER_LABEL,
      tickerSpeedSeconds: parseTickerSpeedSeconds(map["ticker_speed_seconds"]),
    };
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] },
);

