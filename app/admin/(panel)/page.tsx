import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminDashboardData } from "@/lib/admin-cache";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { newsTotal, publishedTotal, views7d, recent } = await getAdminDashboardData();
  const now = new Date();

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
            Дашборд
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Сводка по материалам и просмотрам за последние 7 дней.
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Новая новость
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Новости</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{newsTotal}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Опубликовано: {publishedTotal}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Просмотры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{views7d}</div>
            <div className="mt-1 text-xs text-muted-foreground">за 7 дней</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatDateTime(now).slice(0, 10)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(now).slice(11)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Последние публикации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заголовок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создано</TableHead>
                <TableHead>Публикация</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/news/${n.id}/edit`} className="hover:underline">
                      {n.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      <Link href={`/news/${n.slug}`} className="hover:underline">
                        /news/{n.slug}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{n.status.toLowerCase()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.publishedAt
                      ? formatDateTime(n.publishedAt)
                      : n.scheduledAt
                        ? `scheduled: ${formatDateTime(n.scheduledAt)}`
                        : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

