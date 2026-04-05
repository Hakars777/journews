"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { NewsTickerQuickToggle } from "@/components/admin/news/news-ticker-quick-toggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { bulkDeleteNewsAction, bulkPublishNewsAction, bulkArchiveNewsAction } from "@/app/admin/(panel)/news/actions";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  isTop: boolean;
  isEditorsPick: boolean;
  isTicker: boolean;
  views: number;
  createdAt: Date;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  category: { name: string };
  author: { name: string };
};

export function NewsTableWithBulkActions({ items }: { items: NewsItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((n) => n.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Удалить ${selected.size} новост${selected.size === 1 ? "ь" : selected.size < 5 ? "и" : "ей"}? Это нельзя отменить.`)) return;

    startTransition(async () => {
      const result = await bulkDeleteNewsAction(Array.from(selected));
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        alert(result.message ?? "Ошибка удаления.");
      }
    });
  }

  function handleBulkPublish() {
    if (!selected.size) return;
    startTransition(async () => {
      const result = await bulkPublishNewsAction(Array.from(selected));
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        alert(result.message ?? "Ошибка публикации.");
      }
    });
  }

  function handleBulkArchive() {
    if (!selected.size) return;
    startTransition(async () => {
      const result = await bulkArchiveNewsAction(Array.from(selected));
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        alert(result.message ?? "Ошибка архивации.");
      }
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium mr-1">Выбрано: {selected.size}</span>
          <button
            onClick={handleBulkPublish}
            disabled={isPending}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "..." : "Опубликовать"}
          </button>
          <button
            onClick={handleBulkArchive}
            disabled={isPending}
            className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            {isPending ? "..." : "В архив"}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isPending ? "..." : "Удалить"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Снять выделение
          </button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer"
                title="Выбрать все"
              />
            </TableHead>
            <TableHead>Заголовок</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Автор</TableHead>
            <TableHead className="text-center">Ticker</TableHead>
            <TableHead>Даты</TableHead>
            <TableHead className="text-right">Views</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((n) => (
            <TableRow key={n.id} className={selected.has(n.id) ? "bg-muted/50" : ""}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggleOne(n.id)}
                  className="h-4 w-4 cursor-pointer"
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/news/${n.id}/edit`} className="hover:underline">
                    {n.title}
                  </Link>
                  {n.isTop ? <Badge variant="secondary">top</Badge> : null}
                  {n.isEditorsPick ? <Badge variant="outline">pick</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">/news/{n.slug}</div>
              </TableCell>
              <TableCell>{n.status.toLowerCase()}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{n.category.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{n.author.name}</TableCell>
              <TableCell className="text-center">
                <NewsTickerQuickToggle newsId={n.id} initialEnabled={n.isTicker} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <div>создано: {formatDateTime(n.createdAt)}</div>
                <div>
                  {n.publishedAt
                    ? `опублик.: ${formatDateTime(n.publishedAt)}`
                    : n.scheduledAt
                      ? `scheduled: ${formatDateTime(n.scheduledAt)}`
                      : "—"}
                </div>
              </TableCell>
              <TableCell className="text-right">{n.views}</TableCell>
            </TableRow>
          ))}
          {!items.length ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Ничего не найдено.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
