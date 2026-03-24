import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserForm } from "@/components/admin/users/user-form";
import { getServerAuthSession } from "@/lib/auth";
import { ADMIN_ROLES, isRoleAllowed } from "@/lib/roles";
import { createUserAction } from "@/app/admin/(panel)/users/actions";

export const dynamic = "force-dynamic";

export default async function AdminUserNewPage() {
  const session = await getServerAuthSession();
  if (!isRoleAllowed(session?.user?.role, ADMIN_ROLES)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Доступ запрещён</AlertTitle>
        <AlertDescription>Только admin.</AlertDescription>
      </Alert>
    );
  }

  return (
    <UserForm
      title="Новый пользователь"
      submitLabel="Создать"
      action={createUserAction}
      initial={{ email: "", name: "", role: "EDITOR" }}
    />
  );
}

