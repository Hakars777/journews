import { getSiteSettings } from "@/lib/site";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  return (
    <footer className="border-t py-8">
      <div className="container text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.name}
          </p>
          <p className="max-w-prose">
            Демо-проект: Next.js, Prisma, NextAuth, Tailwind, shadcn/ui.
          </p>
        </div>
      </div>
    </footer>
  );
}

