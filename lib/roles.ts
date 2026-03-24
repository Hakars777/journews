import { UserRole } from "@prisma/client";

export const ADMIN_ROLES: UserRole[] = ["ADMIN"];
export const EDIT_ROLES: UserRole[] = ["ADMIN", "EDITOR"];

export function isRoleAllowed(role: UserRole | undefined | null, allowed: UserRole[]) {
  if (!role) return false;
  return allowed.includes(role);
}

