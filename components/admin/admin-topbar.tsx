import Link from "next/link";
import { UserRole } from "@prisma/client";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { getSiteSettings } from "@/lib/site";

export async function AdminTopbar({
  role,
}: {
  role: UserRole;
}) {
  const settings = await getSiteSettings();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden">
      <div className="container flex h-14 items-center gap-3">
        <Link href="/" className="jn-headline font-semibold uppercase tracking-wide">
          {settings.name}
        </Link>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </div>
      <div className="border-t">
        <div className="container flex gap-3 overflow-x-auto py-2 text-sm text-muted-foreground">
          <Link href="/admin" className="whitespace-nowrap hover:text-foreground">
            Дашборд
          </Link>
          <Link href="/admin/news" className="whitespace-nowrap hover:text-foreground">
            Новости
          </Link>
          <Link href="/admin/categories" className="whitespace-nowrap hover:text-foreground">
            Категории
          </Link>
          <Link href="/admin/tags" className="whitespace-nowrap hover:text-foreground">
            Теги
          </Link>
          <Link href="/admin/authors" className="whitespace-nowrap hover:text-foreground">
            Авторы
          </Link>
          {role === "ADMIN" ? (
            <Link href="/admin/users" className="whitespace-nowrap hover:text-foreground">
              Пользователи
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

