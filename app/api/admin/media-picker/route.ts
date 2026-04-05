import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getCachedAdminMediaPickerItems } from "@/lib/r2-media";
import { EDIT_ROLES, isRoleAllowed } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, EDIT_ROLES)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getCachedAdminMediaPickerItems();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { message: "Не удалось загрузить изображения из галереи." },
      { status: 500 },
    );
  }
}
