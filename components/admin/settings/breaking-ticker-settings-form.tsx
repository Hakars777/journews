"use client";

import { useState } from "react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BreakingTickerSettingsForm({
  initialLabel,
  initialSpeed,
  saveAction,
}: {
  initialLabel: string;
  initialSpeed: number;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [speed, setSpeed] = useState(initialSpeed);

  return (
    <div className="rounded-md border p-6 grid gap-4">
      <div>
        <h2 className="font-semibold">Бегущая строка</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Показывает только отмеченные новости. Если не отмечена ни одна, строка на сайте скрывается.
        </p>
      </div>

      <form action={saveAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ticker_label">Заголовок</Label>
          <Input
            id="ticker_label"
            name="ticker_label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={40}
            placeholder="Срочно"
          />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ticker_speed_seconds">Скорость</Label>
            <span className="text-sm font-semibold">{speed} сек</span>
          </div>
          <input
            id="ticker_speed_seconds"
            name="ticker_speed_seconds"
            type="range"
            min="20"
            max="120"
            step="5"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Быстрее</span>
            <span>Средне</span>
            <span>Медленнее</span>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Превью</div>
          <div className="mt-2 flex items-center overflow-hidden rounded-md bg-primary text-primary-foreground">
            <div className="shrink-0 bg-primary-foreground/15 px-3 py-2 text-xs font-bold uppercase tracking-widest">
              {(label.trim() || "Срочно").slice(0, 20)}
            </div>
            <div className="truncate px-3 py-2 text-sm text-primary-foreground/95">
              Отмеченные новости будут прокручиваться с выбранной скоростью
            </div>
          </div>
        </div>

        <div>
          <FormSubmitButton idleLabel="Сохранить" />
        </div>
      </form>
    </div>
  );
}
