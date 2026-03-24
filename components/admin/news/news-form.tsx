"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { RichTextEditor } from "@/components/admin/news/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const initialFormState: FormState = { ok: true };

type SelectItem = { id: string; name: string; slug?: string };

function toDatetimeLocal(dt?: Date | string | null) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewsForm({
  title,
  submitLabel,
  action,
  successMessage,
  initial,
  categories,
  authors,
  tags,
}: {
  title: string;
  submitLabel: string;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  successMessage?: string;
  initial?: {
    title: string;
    slug: string;
    lead: string;
    contentHtml: string;
    status: string;
    categoryId: string;
    authorId: string;
    tagIds: string[];
    isTop: boolean;
    isEditorsPick: boolean;
    sourceName: string | null;
    sourceUrl: string | null;
    coverImage: string | null;
    galleryImages: string[];
    publishedAt: Date | null;
    scheduledAt: Date | null;
  };
  categories: SelectItem[];
  authors: SelectItem[];
  tags: SelectItem[];
}) {
  const [rawState, formAction] = useFormState(action, initialFormState);
  const state = rawState ?? initialFormState;

  useEffect(() => {
    if (successMessage) toast.success(successMessage);
  }, [successMessage]);

  useEffect(() => {
    if (state.ok === false) toast.error(state.message ?? "Ошибка сохранения");
  }, [state]);

  const [t, setT] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(!!initial?.slug);
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? "<p></p>");

  const initialTagSet = useMemo(() => new Set(initial?.tagIds ?? []), [initial?.tagIds]);

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поля отмеченные звездочкой обязательны. Контент сохраняется как HTML.
          </p>
        </div>
      </div>

      {state.ok === false && state.message ? (
        <Alert variant="destructive">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="grid gap-6">
        <input type="hidden" name="contentHtml" value={contentHtml} />

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
              Основное
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                name="title"
                value={t}
                onChange={(e) => {
                  const v = e.target.value;
                  setT(v);
                  if (!slugDirty) setSlug(slugify(v));
                }}
                required
              />
              {state.fieldErrors?.title?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugDirty(true);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Используется в URL: <Badge variant="secondary">/news/{slug || "..."}</Badge>
              </p>
              {state.fieldErrors?.slug?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lead">Лид *</Label>
              <Textarea
                id="lead"
                name="lead"
                defaultValue={initial?.lead ?? ""}
                rows={3}
                required
              />
              {state.fieldErrors?.lead?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.lead[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Контент *</Label>
              <RichTextEditor initialHtml={contentHtml} onChange={setContentHtml} />
              {state.fieldErrors?.contentHtml?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.contentHtml[0]}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
              Публикация
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="status">Статус *</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={initial?.status ?? "DRAFT"}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  required
                >
                  <option value="DRAFT">draft</option>
                  <option value="PUBLISHED">published</option>
                  <option value="SCHEDULED">scheduled</option>
                  <option value="ARCHIVED">archived</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">Запланировано</Label>
                <Input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(initial?.scheduledAt ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Нужно для статуса <Badge variant="secondary">scheduled</Badge>.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="publishedAt">Опубликовано</Label>
                <Input
                  id="publishedAt"
                  name="publishedAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(initial?.publishedAt ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Можно оставить пустым: выставится автоматически.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Категория *</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={initial?.categoryId ?? categories[0]?.id}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="authorId">Автор *</Label>
                <select
                  id="authorId"
                  name="authorId"
                  defaultValue={initial?.authorId ?? authors[0]?.id}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  required
                >
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Метки</div>
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={initialTagSet.has(tag.id)}
                    />
                    <span>#{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isTop" defaultChecked={initial?.isTop ?? false} />
                <span>Top</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isEditorsPick"
                  defaultChecked={initial?.isEditorsPick ?? false}
                />
                <span>Выбор редакции</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
              Медиа
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {initial?.coverImage ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">Текущая обложка</div>
                <div className="relative aspect-[16/9] max-w-xl overflow-hidden rounded-md border bg-muted">
                  <Image src={initial.coverImage} alt="" fill className="object-cover" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removeCover" value="1" />
                  <span>Удалить обложку</span>
                </label>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="coverFile">Загрузить обложку</Label>
              <Input id="coverFile" name="coverFile" type="file" accept="image/*" />
              <p className="text-xs text-muted-foreground">jpg/png/webp/gif, до 10MB.</p>
            </div>

            {initial?.galleryImages?.length ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">Галерея</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {initial.galleryImages.map((src) => (
                    <div key={src} className="grid gap-2">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
                        <Image src={src} alt="" fill className="object-cover" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" name="removeGallery" value={src} />
                        <span>удалить</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="galleryFiles">Добавить изображения в галерею</Label>
              <Input
                id="galleryFiles"
                name="galleryFiles"
                type="file"
                accept="image/*"
                multiple
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
              Источник
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sourceName">Название</Label>
              <Input
                id="sourceName"
                name="sourceName"
                defaultValue={initial?.sourceName ?? ""}
                placeholder="Напр. Jour News Desk"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sourceUrl">URL</Label>
              <Input
                id="sourceUrl"
                name="sourceUrl"
                defaultValue={initial?.sourceUrl ?? ""}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">{submitLabel}</Button>
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Назад
          </Button>
        </div>
      </form>
    </div>
  );
}
