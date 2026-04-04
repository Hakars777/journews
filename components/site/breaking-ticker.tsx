import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getTickerNews = unstable_cache(
  async () =>
    prisma.news.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: { id: true, slug: true, title: true },
    }),
  ["ticker-news"],
  { revalidate: 60 },
);

export async function BreakingTicker() {
  const items = await getTickerNews();
  if (!items.length) return null;

  // Duplicate items for seamless infinite loop
  const doubled = [...items, ...items];

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden border-b border-primary/20">
      <div className="flex items-stretch">
        <div className="shrink-0 bg-primary-foreground/15 px-4 py-2 flex items-center border-r border-primary-foreground/20">
          <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            Срочно
          </span>
        </div>
        <div className="overflow-hidden flex-1 py-2">
          <div className="animate-ticker inline-flex gap-12 whitespace-nowrap text-sm">
            {doubled.map((n, i) => (
              <Link
                key={`${n.id}-${i}`}
                href={`/news/${n.slug}`}
                className="hover:underline underline-offset-2 shrink-0"
              >
                {n.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
