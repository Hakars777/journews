import Link from "next/link";
import { cn } from "@/lib/utils";

function pageRange(current: number, total: number) {
  const window = 2;
  const start = Math.max(1, current - window);
  const end = Math.min(total, current + window);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

export function PaginationLinks({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageRange(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 py-6">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={cn(
          "rounded-md border px-3 py-1 text-sm",
          page <= 1
            ? "pointer-events-none opacity-50"
            : "hover:bg-muted transition-colors",
        )}
      >
        Назад
      </Link>

      {pages[0] > 1 ? (
        <>
          <Link
            href={buildHref(1)}
            className={cn(
              "rounded-md border px-3 py-1 text-sm hover:bg-muted transition-colors",
              page === 1 && "bg-muted",
            )}
          >
            1
          </Link>
          <span className="px-2 text-muted-foreground">…</span>
        </>
      ) : null}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={cn(
            "rounded-md border px-3 py-1 text-sm hover:bg-muted transition-colors",
            p === page && "bg-muted",
          )}
        >
          {p}
        </Link>
      ))}

      {pages[pages.length - 1] < totalPages ? (
        <>
          <span className="px-2 text-muted-foreground">…</span>
          <Link
            href={buildHref(totalPages)}
            className={cn(
              "rounded-md border px-3 py-1 text-sm hover:bg-muted transition-colors",
              page === totalPages && "bg-muted",
            )}
          >
            {totalPages}
          </Link>
        </>
      ) : null}

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        className={cn(
          "rounded-md border px-3 py-1 text-sm",
          page >= totalPages
            ? "pointer-events-none opacity-50"
            : "hover:bg-muted transition-colors",
        )}
      >
        Вперёд
      </Link>
    </nav>
  );
}
