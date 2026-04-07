import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getCachedAdminMediaPickerPage, type AdminMediaPickerSortMode } from "@/lib/r2-media";
import { EDIT_ROLES, isRoleAllowed } from "@/lib/roles";

export const dynamic = "force-dynamic";

const SORT_MODES = new Set<AdminMediaPickerSortMode>(["newest", "oldest", "name-asc", "name-desc"]);

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user || !isRoleAllowed(session.user.role, EDIT_ROLES)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get("page") ?? "1");
    const pageSizeParam = Number(searchParams.get("pageSize") ?? "24");
    const sortParam = searchParams.get("sort") ?? "newest";
    const query = searchParams.get("q") ?? "";

    const data = await getCachedAdminMediaPickerPage({
      page: Number.isFinite(pageParam) ? pageParam : 1,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : 24,
      query,
      sort: SORT_MODES.has(sortParam as AdminMediaPickerSortMode)
        ? (sortParam as AdminMediaPickerSortMode)
        : "newest",
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Не удалось загрузить изображения из галереи." },
      { status: 500 },
    );
  }
}
