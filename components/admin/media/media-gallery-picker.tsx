"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type MediaGalleryItem = {
  key: string;
  url: string;
  folder: string;
};

function fileNameFromKey(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

export function MediaGalleryPicker({
  title,
  description,
  emptyMessage = "Галерея пока пуста.",
  items,
  multiple = false,
  selectedUrls,
  onChange,
}: {
  title: string;
  description?: string;
  emptyMessage?: string;
  items: MediaGalleryItem[];
  multiple?: boolean;
  selectedUrls: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedUrls), [selectedUrls]);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      return (
        item.folder.toLowerCase().includes(normalized) ||
        item.key.toLowerCase().includes(normalized) ||
        fileNameFromKey(item.key).toLowerCase().includes(normalized)
      );
    });
  }, [items, query]);

  const triggerLabel = multiple
    ? selectedUrls.length
      ? `Галерея (${selectedUrls.length})`
      : "Выбрать из галереи"
    : selectedUrls[0]
      ? "Заменить из галереи"
      : "Выбрать из галереи";

  const toggle = (url: string) => {
    if (!multiple) {
      onChange([url]);
      setOpen(false);
      return;
    }

    if (selectedSet.has(url)) {
      onChange(selectedUrls.filter((item) => item !== url));
      return;
    }

    onChange([...selectedUrls, url]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden p-0">
        <div className="grid h-full grid-rows-[auto_auto_1fr]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description ??
                "Выберите уже загруженный файл из Cloudflare R2. Загрузка нового файла по-прежнему работает отдельно."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по имени файла или папке"
                className="max-w-md"
              />
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Найдено: {filteredItems.length}</Badge>
                {multiple ? <Badge variant="outline">Выбрано: {selectedUrls.length}</Badge> : null}
              </div>
            </div>
            {multiple && selectedUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedUrls.map((url) => {
                  const item = items.find((entry) => entry.url === url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => toggle(url)}
                      className="rounded-full border px-3 py-1 text-xs transition hover:border-destructive hover:text-destructive"
                    >
                      {item ? fileNameFromKey(item.key) : "Выбранный файл"} ×
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="overflow-y-auto px-6 py-5">
            {filteredItems.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => {
                  const selected = selectedSet.has(item.url);
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => toggle(item.url)}
                      className={`grid gap-3 overflow-hidden rounded-xl border bg-background text-left transition ${
                        selected
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:-translate-y-0.5 hover:shadow-sm"
                      }`}
                    >
                      <div className="relative aspect-[4/3] bg-muted">
                        <Image
                          src={item.url}
                          alt={fileNameFromKey(item.key)}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="grid gap-2 px-4 pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <Badge variant={selected ? "default" : "outline"}>{item.folder}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {selected ? "Выбрано" : multiple ? "Добавить" : "Выбрать"}
                          </span>
                        </div>
                        <div className="truncate text-sm font-medium">{fileNameFromKey(item.key)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
