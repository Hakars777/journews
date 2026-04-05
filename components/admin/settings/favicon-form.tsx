"use client";

import Image from "next/image";
import { useState } from "react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { MediaGalleryPicker } from "@/components/admin/media/media-gallery-picker";

type MediaItem = { key: string; url: string; folder: string };

export function FaviconForm({
  initialFaviconUrl,
  mediaItems,
  saveAction,
  deleteAction,
}: {
  initialFaviconUrl: string | null;
  mediaItems: MediaItem[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl ?? "");

  return (
    <div className="rounded-md border p-6 grid gap-4">
      <h2 className="font-semibold">Favicon</h2>

      {faviconUrl ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted">
            <Image src={faviconUrl} alt="favicon" fill className="object-contain p-1" />
          </div>
          <span className="max-w-[340px] truncate text-sm text-muted-foreground">{faviconUrl}</span>
          <button
            type="button"
            onClick={() => setFaviconUrl("")}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Очистить выбор
          </button>
          {initialFaviconUrl ? (
            <form action={deleteAction}>
              <FormSubmitButton
                idleLabel="Удалить"
                pendingLabel="Удаляю..."
                variant="link"
                className="h-auto p-0 text-destructive"
              />
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Favicon не установлен — используется стандартный значок.</p>
      )}

      <form action={saveAction} className="grid gap-3">
        <input type="hidden" name="selectedFaviconUrl" value={faviconUrl} />

        <label className="text-sm font-medium">
          {faviconUrl ? "Заменить favicon" : "Загрузить favicon"}
        </label>
        <p className="text-xs text-muted-foreground">
          Рекомендуемый размер: 32×32 или 64×64 пикселей. Форматы: PNG, ICO, WebP.
        </p>

        <div className="flex flex-wrap gap-3">
          <input
            type="file"
            name="favicon"
            accept="image/png,image/x-icon,image/webp,image/jpeg"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          />
          <MediaGalleryPicker
            title="Выбор favicon из галереи"
            description="Можно взять уже загруженное изображение из R2 вместо повторной загрузки."
            items={mediaItems}
            selectedUrls={faviconUrl ? [faviconUrl] : []}
            onChange={(next) => setFaviconUrl(next[0] ?? "")}
          />
          <FormSubmitButton idleLabel="Сохранить" />
        </div>
      </form>
    </div>
  );
}
