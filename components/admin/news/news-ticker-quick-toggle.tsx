"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleNewsTickerQuickAction } from "@/app/admin/(panel)/news/actions";
import { Button } from "@/components/ui/button";

export function NewsTickerQuickToggle({
  newsId,
  initialEnabled,
}: {
  newsId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    const nextValue = !enabled;

    startTransition(async () => {
      const result = await toggleNewsTickerQuickAction(newsId, nextValue);
      if (!result.ok) {
        alert(result.message ?? "Не удалось обновить переключатель.");
        return;
      }

      setEnabled(result.isTicker ?? nextValue);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "default" : "outline"}
      disabled={isPending}
      onClick={handleToggle}
      aria-pressed={enabled}
      className="min-w-20"
      title={enabled ? "Убрать из бегущей строки" : "Добавить в бегущую строку"}
    >
      {isPending ? "..." : enabled ? "Вкл" : "Выкл"}
    </Button>
  );
}
