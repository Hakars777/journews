import { getServerAuthSession } from "@/lib/auth";
import { ADMIN_ROLES, EDIT_ROLES, isRoleAllowed } from "@/lib/roles";

export async function assertEditor() {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, EDIT_ROLES)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function assertAdmin() {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, ADMIN_ROLES)) {
    throw new Error("Forbidden");
  }
  return session;
}

