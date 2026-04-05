import type { CSSProperties } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, toJsonLd } from "@/lib/seo";
import { runSchedulerIfNeeded } from "@/lib/scheduler";
import { getSiteSettings } from "@/lib/site";

// Cache the site shell for up to 300 s (ISR). The scheduler inside fires
// at most once per revalidation period, which matches its own 60-s throttle.
export const revalidate = 300;

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();

  try {
    await runSchedulerIfNeeded();
  } catch {
    // Scheduler failure must not crash the page
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={
        {
          "--jn-mobile-article-title-scale": String(settings.mobileArticleTitleScale / 100),
        } as CSSProperties
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(buildOrganizationJsonLd(settings.name)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildWebsiteJsonLd(settings.name, settings.description)),
        }}
      />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

