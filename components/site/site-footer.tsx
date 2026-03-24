import { SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
          <p className="max-w-prose">
            Демо-проект: Next.js, Prisma, NextAuth, Tailwind, shadcn/ui.
          </p>
        </div>
      </div>
    </footer>
  );
}

