import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  if (!items.length) return null;

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((it, idx) => (
        <span key={`${it.label}-${idx}`} className="flex items-center gap-1">
          {idx > 0 ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
          {it.href ? (
            <Link href={it.href} className="hover:text-foreground transition-colors">
              {it.label}
            </Link>
          ) : (
            <span className="text-foreground">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

