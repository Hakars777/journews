"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-md border p-8">
        <h1 className="jn-headline text-2xl font-semibold">Ошибка</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Что-то пошло не так. Попробуйте обновить страницу или вернуться позже.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Повторить
          </button>
          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            На главную
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-muted-foreground">digest: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}

