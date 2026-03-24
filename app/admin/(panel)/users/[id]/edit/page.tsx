import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserForm } from "@/components/admin/users/user-form";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { ADMIN_ROLES, isRoleAllowed } from "@/lib/roles";
import { updateUserAction } from "@/app/admin/(panel)/users/actions";

export const dynamic = "force-dynamic";

export default async function AdminUserEditPage({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (!isRoleAllowed(session?.user?.role, ADMIN_ROLES)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Доступ запрещён</AlertTitle>
        <AlertDescription>Только admin.</AlertDescription>
      </Alert>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) notFound();

  const bound = updateUserAction.bind(null, user.id);

  return (
    <UserForm
      title="Редактирование пользователя"
      submitLabel="Сохранить"
      action={bound}
      passwordOptional
      initial={{
        email: user.email,
        name: user.name ?? "",
        role: user.role,
      }}
    />
  );
}

