"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]> };

const initialFormState: FormState = { ok: true };

export function UserForm({
  title,
  submitLabel,
  action,
  initial,
  passwordOptional,
}: {
  title: string;
  submitLabel: string;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: { email: string; name: string; role: "ADMIN" | "EDITOR" };
  passwordOptional?: boolean;
}) {
  const [rawState, formAction] = useFormState(action, initialFormState);
  const state = rawState ?? initialFormState;
  useEffect(() => {
    if (state.ok === false) toast.error(state.message ?? "Ошибка");
  }, [state]);

  const [email, setEmail] = useState(initial?.email ?? "");
  const [name, setName] = useState(initial?.name ?? "");

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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {state.fieldErrors?.email?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Имя *</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {state.fieldErrors?.name?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Роль *</Label>
              <select
                id="role"
                name="role"
                defaultValue={initial?.role ?? "EDITOR"}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="EDITOR">editor</option>
                <option value="ADMIN">admin</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                Пароль {passwordOptional ? "(необязательно)" : "*"}
              </Label>
              <Input id="password" name="password" type="password" />
              <p className="text-xs text-muted-foreground">Минимум 6 символов.</p>
              {state.fieldErrors?.password?.length ? (
                <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
              ) : null}
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
