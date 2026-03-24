import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { prisma } from "@/lib/prisma";
import { deleteAuthorAction } from "@/app/admin/(panel)/authors/actions";

export const dynamic = "force-dynamic";

export default async function AdminAuthorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const authors = await prisma.author.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, avatar: true, _count: { select: { news: true } } },
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Авторы</h1>
          <p className="mt-1 text-sm text-muted-foreground">CRUD авторов.</p>
        </div>
        <Link
          href="/admin/authors/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Создать
        </Link>
      </div>

      {error === "in_use" ? (
        <Alert variant="destructive">
          <AlertTitle>Нельзя удалить</AlertTitle>
          <AlertDescription>
            Этот автор используется в новостях. Сначала переназначьте материалы другому автору.
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
                <TableHead>Автор</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Новости</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border bg-muted">
                        {a.avatar ? (
                          <Image src={a.avatar} alt="" fill className="object-cover" />
                        ) : null}
                      </div>
                      <Link href={`/admin/authors/${a.id}/edit`} className="hover:underline">
                        {a.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.slug}</TableCell>
                  <TableCell className="text-right">{a._count.news}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmActionForm
                      action={deleteAuthorAction.bind(null, a.id)}
                      confirmText="Удалить автора?"
                      label="Удалить"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!authors.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Нет авторов.
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

