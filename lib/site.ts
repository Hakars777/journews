export const SITE_NAME = "Jour News";
export const SITE_DESCRIPTION =
  "Jour News: демо-новостной сайт на Next.js + Prisma + NextAuth.";

export function getBaseUrl() {
  const envUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return "http://localhost:3000";
}

