import Link from "next/link";
import { NewsStatus, type Prisma } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationLinks } from "@/components/site/pagination";
import { NewsTableWithBulkActions } from "@/components/admin/news/news-bulk-actions";
import { getAdminNewsFilterOptions } from "@/lib/admin-cache";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";
import { isPostgres } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function containsInsensitive(q: string) {
  return isPostgres()
    ? ({ contains: q, mode: "insensitive" } as unknown as Prisma.StringFilter)
    : ({ contains: q } as Prisma.StringFilter);
}

export default async function AdminNewsListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const page = parsePage(searchParams.page);
  const { skip, take } = getPagination(page, PAGE_SIZE);

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "";
  const categoryId = typeof searchParams.categoryId === "string" ? searchParams.categoryId : "";
  const authorId = typeof searchParams.authorId === "string" ? searchParams.authorId : "";
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "publishedAt_desc";

  const where: Prisma.NewsWhereInput = {};
  if (status && (Object.values(NewsStatus) as string[]).includes(status)) {
    where.status = status as NewsStatus;
  }
  if (categoryId) where.categoryId = categoryId;
  if (authorId) where.authorId = authorId;
  if (q) {
    const c = containsInsensitive(q);
    where.OR = [{ title: c }, { slug: c }, { lead: c }];
  }

  const orderBy: Prisma.NewsOrderByWithRelationInput =
    sort === "publishedAt_desc"
      ? { publishedAt: "desc" }
      : sort === "publishedAt_asc"
        ? { publishedAt: "asc" }
        : sort === "views_desc"
          ? { views: "desc" }
          : sort === "views_asc"
            ? { views: "asc" }
            : { createdAt: "desc" };

  const [total, items, { categories, authors }] = await Promise.all([
    prisma.news.count({ where }),
    prisma.news.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isTop: true,
        isEditorsPick: true,
        views: true,
        createdAt: true,
        publishedAt: true,
        scheduledAt: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    }),
    getAdminNewsFilterOptions(),
  ]);

  const totalPages = pageCount(total, PAGE_SIZE);

  return (
    <div className="grid gap-6">
      {searchParams.created === "1" ? (
        <Alert>
          <AlertTitle>Сохранено</AlertTitle>
          <AlertDescription>Новость создана.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
            Новости
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поиск, фильтры и управление публикациями.
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Создать
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/admin/news" className="grid gap-3 sm:grid-cols-5">
            <input
              name="q"
              defaultValue={q}
              placeholder="Поиск"
              className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Статус: все</option>
              <option value="DRAFT">draft</option>
              <option value="PUBLISHED">published</option>
              <option value="SCHEDULED">scheduled</option>
              <option value="ARCHIVED">archived</option>
            </select>
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Категория: все</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              name="authorId"
              defaultValue={authorId}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Автор: все</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
            >
              <option value="createdAt_desc">Сортировка: новые</option>
              <option value="publishedAt_desc">Опубликовано: новые</option>
              <option value="publishedAt_asc">Опубликовано: старые</option>
              <option value="views_desc">Просмотры: больше</option>
              <option value="views_asc">Просмотры: меньше</option>
            </select>

            <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Применить
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Список ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewsTableWithBulkActions items={items} />

          <PaginationLinks
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const sp = new URLSearchParams();
              if (q) sp.set("q", q);
              if (status) sp.set("status", status);
              if (categoryId) sp.set("categoryId", categoryId);
              if (authorId) sp.set("authorId", authorId);
              if (sort) sp.set("sort", sort);
              if (p > 1) sp.set("page", String(p));
              const qs = sp.toString();
              return qs ? `/admin/news?${qs}` : "/admin/news";
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
