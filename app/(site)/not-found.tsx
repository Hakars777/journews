import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-md border p-8">
        <h1 className="jn-headline text-2xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, ссылка устарела или материал был перемещён.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            На главную
          </Link>
          <Link
            href="/search"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Поиск
          </Link>
        </div>
      </div>
    </div>
  );
}

