"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MediaGalleryItem = {
  key: string;
  url: string;
  folder: string;
  lastModified?: Date | string | null;
};

type SortMode = "newest" | "oldest" | "name-asc" | "name-desc";

function fileNameFromKey(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

function toTimestamp(value?: Date | string | null) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function formatUploadDate(value?: Date | string | null) {
  const ts = toTimestamp(value);
  if (!ts) return "Дата неизвестна";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function compareItems(left: MediaGalleryItem, right: MediaGalleryItem, sortMode: SortMode) {
  if (sortMode === "newest") {
    return (
      toTimestamp(right.lastModified) - toTimestamp(left.lastModified) ||
      left.key.localeCompare(right.key)
    );
  }

  if (sortMode === "oldest") {
    return (
      toTimestamp(left.lastModified) - toTimestamp(right.lastModified) ||
      left.key.localeCompare(right.key)
    );
  }

  const leftName = fileNameFromKey(left.key);
  const rightName = fileNameFromKey(right.key);

  if (sortMode === "name-asc") {
    return leftName.localeCompare(rightName) || left.key.localeCompare(right.key);
  }

  return rightName.localeCompare(leftName) || left.key.localeCompare(right.key);
}

export function MediaGalleryPicker({
  title,
  description,
  emptyMessage = "Галерея пока пуста.",
  buttonLabel = "Выбрать из галереи",
  selectedButtonLabel,
  items,
  loadUrl,
  multiple = false,
  selectedUrls,
  onChange,
}: {
  title: string;
  description?: string;
  emptyMessage?: string;
  buttonLabel?: string;
  selectedButtonLabel?: string;
  items?: MediaGalleryItem[];
  loadUrl?: string;
  multiple?: boolean;
  selectedUrls: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [itemsState, setItemsState] = useState<MediaGalleryItem[]>(items ?? []);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "ready" | "error">(
    items?.length ? "ready" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setItemsState(items ?? []);
    setLoadingState(items?.length ? "ready" : "idle");
    setErrorMessage("");
  }, [items]);

  useEffect(() => {
    if (!open || loadingState !== "idle") return;

    let cancelled = false;

    async function loadItems() {
      setLoadingState("loading");
      setErrorMessage("");

      try {
        const response = await fetch(loadUrl ?? "/api/admin/media-picker", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = (await response.json().catch(() => null)) as
          | { items?: MediaGalleryItem[]; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.message || "Не удалось загрузить галерею.");
        }

        if (cancelled) return;
        setItemsState(Array.isArray(data?.items) ? data.items : []);
        setLoadingState("ready");
      } catch (error) {
        if (cancelled) return;
        setItemsState([]);
        setLoadingState("error");
        setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить галерею.");
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [loadUrl, loadingState, open]);

  const selectedSet = useMemo(() => new Set(selectedUrls), [selectedUrls]);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const baseItems = !normalized
      ? itemsState
      : itemsState.filter((item) => {
          return (
            item.folder.toLowerCase().includes(normalized) ||
            item.key.toLowerCase().includes(normalized) ||
            fileNameFromKey(item.key).toLowerCase().includes(normalized)
          );
        });

    return [...baseItems].sort((left, right) => compareItems(left, right, sortMode));
  }, [itemsState, query, sortMode]);

  const triggerLabel = multiple
    ? selectedUrls.length
      ? selectedButtonLabel ?? `${buttonLabel} (${selectedUrls.length})`
      : buttonLabel
    : selectedUrls[0]
      ? selectedButtonLabel ?? "Заменить из галереи"
      : buttonLabel;

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
      <DialogContent className="h-[85vh] max-h-[85vh] max-w-6xl overflow-hidden p-0">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description ??
                "Выберите уже загруженный файл из Cloudflare R2. Загрузка нового файла по-прежнему работает отдельно."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по имени файла или папке"
                  className="max-w-md"
                />
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Сортировка</span>
                  <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Выберите сортировку" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Сначала новые</SelectItem>
                      <SelectItem value="oldest">Сначала старые</SelectItem>
                      <SelectItem value="name-asc">Имя: A → Z</SelectItem>
                      <SelectItem value="name-desc">Имя: Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Найдено: {filteredItems.length}</Badge>
                {multiple ? <Badge variant="outline">Выбрано: {selectedUrls.length}</Badge> : null}
              </div>
            </div>
            {multiple && selectedUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedUrls.map((url) => {
                  const item = itemsState.find((entry) => entry.url === url);
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

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {loadingState === "loading" ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Загружаю изображения из галереи...
              </div>
            ) : loadingState === "error" ? (
              <div className="grid gap-4 rounded-xl border border-dashed p-10 text-center">
                <div className="text-sm text-muted-foreground">{errorMessage}</div>
                <div>
                  <Button type="button" variant="outline" onClick={() => setLoadingState("idle")}>
                    Повторить
                  </Button>
                </div>
              </div>
            ) : filteredItems.length ? (
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
                        <div className="text-xs text-muted-foreground">
                          {formatUploadDate(item.lastModified)}
                        </div>
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
