import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { runSchedulerIfNeeded } from "@/lib/scheduler";

// Cache the site shell for up to 300 s (ISR). The scheduler inside fires
// at most once per revalidation period, which matches its own 60-s throttle.
export const revalidate = 300;

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await runSchedulerIfNeeded();
  } catch {
    // Scheduler failure must not crash the page
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

