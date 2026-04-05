import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { requireEditorSession } from "@/lib/guard";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, settings] = await Promise.all([requireEditorSession(), getSiteSettings()]);

  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar
        role={session.user.role}
        email={session.user.email || "user"}
        siteName={settings.name}
      />
      <div className="min-w-0 flex-1">
        <AdminTopbar role={session.user.role} siteName={settings.name} />
        <div className="container py-6">{children}</div>
      </div>
    </div>
  );
}

