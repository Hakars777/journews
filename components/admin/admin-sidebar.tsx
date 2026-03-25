import Link from "next/link";
import { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { getSiteSettings } from "@/lib/site";

const nav = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/news", label: "Новости" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/tags", label: "Теги" },
  { href: "/admin/authors", label: "Авторы" },
];

export async function AdminSidebar({
  role,
  email,
}: {
  role: UserRole;
  email: string;
}) {
  const settings = await getSiteSettings();
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="h-3 w-3 rounded-sm bg-primary" aria-hidden />
        <Link href="/" className="jn-headline font-semibold uppercase tracking-wide">
          {settings.name}
        </Link>
      </div>

      <div className="flex-1 p-4">
        <div className="grid gap-1">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              )}
            >
              {i.label}
            </Link>
          ))}

          {role === "ADMIN" ? (
            <>
              <Link
                href="/admin/users"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Пользователи
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Настройки
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">
            {email} • {role.toLowerCase()}
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

