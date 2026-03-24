import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { requireEditorSession } from "@/lib/guard";
import { runSchedulerIfNeeded } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await runSchedulerIfNeeded();
  const session = await requireEditorSession();

  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar
        role={session.user.role}
        email={session.user.email || "user"}
      />
      <div className="min-w-0 flex-1">
        <AdminTopbar role={session.user.role} />
        <div className="container py-6">{children}</div>
      </div>
    </div>
  );
}

