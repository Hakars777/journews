"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };

const initialFormState: FormState = { ok: true };

export function AuthorForm({
  title,
  submitLabel,
  action,
  initial,
}: {
  title: string;
  submitLabel: string;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: { name: string; slug: string; bio: string | null; avatar: string | null };
}) {
  const [rawState, formAction] = useFormState(action, initialFormState);
  const state = rawState ?? initialFormState;
  useEffect(() => {
    if (state.ok === false) toast.error(state.message ?? "Ошибка");
  }, [state]);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(!!initial?.slug);

  return (
    <div className="grid gap-6">
      <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">{title}</h1>

      {state.ok === false && state.message ? (
        <Alert variant="destructive">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
              Данные
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!slugDirty) setSlug(slugify(v));
                }}
                required
              />
              {state.fieldErrors?.name?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
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
              {state.fieldErrors?.slug?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Био</Label>
              <Textarea id="bio" name="bio" defaultValue={initial?.bio ?? ""} rows={4} />
            </div>

            {initial?.avatar ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium">Текущий аватар</div>
                <div className="relative h-24 w-24 overflow-hidden rounded-full border bg-muted">
                  <Image src={initial.avatar} alt="" fill className="object-cover" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removeAvatar" value="1" />
                  <span>Удалить аватар</span>
                </label>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="avatarFile">Загрузить аватар</Label>
              <Input id="avatarFile" name="avatarFile" type="file" accept="image/*" />
              <p className="text-xs text-muted-foreground">jpg/png/webp/gif, до 10MB.</p>
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
