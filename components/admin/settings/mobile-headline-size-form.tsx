"use client";

import { useState } from "react";
import { FormSubmitButton } from "@/components/admin/form-submit-button";

export function MobileHeadlineSizeForm({
  initialValue,
  saveAction,
}: {
  initialValue: number;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="rounded-md border p-6 grid gap-4">
      <div>
        <h2 className="font-semibold">Мобильный заголовок новости</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Настройка влияет только на страницу новости на телефоне. 100% = текущий размер, ниже = компактнее.
        </p>
      </div>

      <form action={saveAction} className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="mobile_article_title_scale" className="text-sm font-medium">
            Размер на телефоне
          </label>
          <span className="text-sm font-semibold">{value}%</span>
        </div>

        <input
          id="mobile_article_title_scale"
          name="mobile_article_title_scale"
          type="range"
          min="70"
          max="100"
          step="1"
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="w-full accent-primary"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>70%</span>
          <span>85%</span>
          <span>100%</span>
        </div>

        <div className="rounded-md border bg-muted/20 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Превью телефона</div>
          <div
            className="mt-2 max-w-[320px] font-serif font-semibold leading-[1.06] tracking-tight"
            style={{ fontSize: `calc(1.875rem * ${value / 100})`, overflowWrap: "anywhere" }}
          >
            Пример длинного заголовка новости для мобильного экрана
          </div>
        </div>

        <div>
          <FormSubmitButton idleLabel="Сохранить" />
        </div>
      </form>
    </div>
  );
}
