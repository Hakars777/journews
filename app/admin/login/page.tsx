import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth";
import { EDIT_ROLES, isRoleAllowed } from "@/lib/roles";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const [session, settings] = await Promise.all([
    getServerAuthSession(),
    getSiteSettings(),
  ]);
  if (session?.user && isRoleAllowed(session.user.role, EDIT_ROLES)) {
    redirect("/admin");
  }

  return (
    <div className="container flex min-h-dvh items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="jn-headline text-xl font-semibold">
            Вход в админку {settings.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

