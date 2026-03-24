import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { ADMIN_ROLES, isRoleAllowed } from "@/lib/roles";
import { deleteUserAction } from "@/app/admin/(panel)/users/actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerAuthSession();
  const role = session?.user?.role;

  if (!isRoleAllowed(role, ADMIN_ROLES)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Доступ запрещён</AlertTitle>
        <AlertDescription>Управление пользователями доступно только admin.</AlertDescription>
      </Alert>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
            Пользователи
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Только admin.</p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Создать
        </Link>
      </div>

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
                <TableHead>Email</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/users/${u.id}/edit`} className="hover:underline">
                      {u.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.role.toLowerCase()}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmActionForm
                      action={deleteUserAction.bind(null, u.id)}
                      confirmText="Удалить пользователя?"
                      label="Удалить"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!users.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Нет пользователей.
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

