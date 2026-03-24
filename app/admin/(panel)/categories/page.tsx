import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { prisma } from "@/lib/prisma";
import { deleteCategoryAction } from "@/app/admin/(panel)/categories/actions";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { news: true } } },
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
            Категории
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">CRUD категорий.</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Создать
        </Link>
      </div>

      {error === "in_use" ? (
        <Alert variant="destructive">
          <AlertTitle>Нельзя удалить</AlertTitle>
          <AlertDescription>
            Эта категория используется в новостях. Сначала переназначьте новости на другую категорию.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Список
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Новости</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/categories/${c.id}/edit`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-right">{c._count.news}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmActionForm
                      action={deleteCategoryAction.bind(null, c.id)}
                      confirmText="Удалить категорию?"
                      label="Удалить"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!categories.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Нет категорий.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

