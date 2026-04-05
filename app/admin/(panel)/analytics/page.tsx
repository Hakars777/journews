import { prisma } from "@/lib/prisma";
import { isPostgres } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, FileText, FolderOpen, Users } from "lucide-react";
import {
  ViewsChart,
  PublishedChart,
  CategoryChart,
  TopArticlesList,
} from "@/components/admin/analytics/charts";

export const dynamic = "force-dynamic";

type DayCount = { date: string; count: number };

async function getAnalyticsData() {
  const [
    totalPublished,
    totalDraft,
    totalScheduled,
    totalAuthors,
    totalCategories,
    totalViewEvents,
    topArticles,
    categoryStats,
  ] = await Promise.all([
    prisma.news.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
    prisma.news.count({ where: { status: "DRAFT" } }).catch(() => 0),
    prisma.news.count({ where: { status: "SCHEDULED" } }).catch(() => 0),
    prisma.author.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.newsView.count().catch(() => 0),
    prisma.news.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 10,
      select: { id: true, title: true, views: true, slug: true },
    }).catch(() => []),
    prisma.category.findMany({
      select: { name: true, _count: { select: { news: { where: { status: "PUBLISHED" } } } } },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ]);

  let viewsPerDay: DayCount[] = [];
  let publishedPerDay: DayCount[] = [];

  if (isPostgres()) {
    try {
      const [viewRows, pubRows] = await Promise.all([
        prisma.$queryRaw<{ date: Date; count: bigint }[]>`
          SELECT DATE("createdAt") as date, COUNT(*) as count
          FROM "NewsView"
          WHERE "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY DATE("createdAt")
          ORDER BY date
        `,
        prisma.$queryRaw<{ date: Date; count: bigint }[]>`
          SELECT DATE("publishedAt") as date, COUNT(*) as count
          FROM "News"
          WHERE status = 'PUBLISHED'
            AND "publishedAt" IS NOT NULL
            AND "publishedAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY DATE("publishedAt")
          ORDER BY date
        `,
      ]);
      viewsPerDay = viewRows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        count: Number(r.count),
      }));
      publishedPerDay = pubRows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        count: Number(r.count),
      }));
    } catch {
      viewsPerDay = [];
      publishedPerDay = [];
    }
  }

  // Fill missing days with 0
  const filled = (data: DayCount[]): DayCount[] => {
    const map = new Map(data.map((d) => [d.date, d.count]));
    const result: DayCount[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key.slice(5), count: map.get(key) ?? 0 }); // show MM-DD
    }
    return result;
  };

  return {
    stats: { totalPublished, totalDraft, totalScheduled, totalAuthors, totalCategories, totalViewEvents },
    topArticles,
    categoryStats: categoryStats.map((c) => ({ name: c.name, count: c._count.news })),
    viewsPerDay: filled(viewsPerDay),
    publishedPerDay: filled(publishedPerDay),
  };
}

export default async function AnalyticsPage() {
  const { stats, topArticles, categoryStats, viewsPerDay, publishedPerDay } =
    await getAnalyticsData();

  const maxViews = Math.max(...topArticles.map((a) => a.views), 1);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Аналитика</h1>
        <p className="mt-1 text-sm text-muted-foreground">Статистика сайта.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Опубликовано</p>
              <p className="text-2xl font-bold">{stats.totalPublished}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-primary/10 p-3">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Просмотры (всего)</p>
              <p className="text-2xl font-bold">{stats.totalViewEvents.toLocaleString("ru-RU")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-primary/10 p-3">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Категории</p>
              <p className="text-2xl font-bold">{stats.totalCategories}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Авторы</p>
              <p className="text-2xl font-bold">{stats.totalAuthors}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Черновики", value: stats.totalDraft },
          { label: "Запланировано", value: stats.totalScheduled },
          { label: "Опубликовано", value: stats.totalPublished },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.round((s.value / Math.max(stats.totalPublished + stats.totalDraft + stats.totalScheduled, 1)) * 100)}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-sm font-semibold uppercase tracking-wide">
              Просмотры за 30 дней
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ViewsChart data={viewsPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-sm font-semibold uppercase tracking-wide">
              Публикации за 30 дней
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PublishedChart data={publishedPerDay} />
          </CardContent>
        </Card>
      </div>

      {/* Category chart + Top articles */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-sm font-semibold uppercase tracking-wide">
              Статьи по категориям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={categoryStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-sm font-semibold uppercase tracking-wide">
              Топ статей по просмотрам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopArticlesList articles={topArticles} maxViews={maxViews} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
