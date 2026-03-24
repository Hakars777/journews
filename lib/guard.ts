import { getServerAuthSession } from "@/lib/auth";
import { EDIT_ROLES, ADMIN_ROLES, isRoleAllowed } from "@/lib/roles";
import { redirect } from "next/navigation";

export async function requireEditorSession() {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, EDIT_ROLES)) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAdminSession() {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, ADMIN_ROLES)) {
    redirect("/admin/login");
  }
  return session;
}

