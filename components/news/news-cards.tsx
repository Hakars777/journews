import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

type NewsCardItem = {
  slug: string;
  title: string;
  lead?: string | null;
  coverImage?: string | null;
  publishedAt?: Date | null;
  category?: { name: string; slug: string } | null;
  author?: { name: string; slug: string } | null;
};

function Cover({
  src,
  alt,
  className,
  priority,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
        <Image src={src} alt={alt} fill className="object-cover" priority={priority} sizes={sizes} quality={85} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gradient-to-br from-zinc-100 to-zinc-200",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_20%,rgba(177,0,0,0.25),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(0,0,0,0.08),transparent_60%)]" />
    </div>
  );
}

export function NewsCardBig({ item }: { item: NewsCardItem }) {
  return (
    <article className="group relative">
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0" aria-label={item.title} />
      <div className="grid gap-3">
        <Link href={`/news/${item.slug}`} className="relative z-10 block">
          <Cover
            src={item.coverImage}
            alt={item.title}
            className="aspect-[16/9] sm:aspect-[21/9]"
            priority
            sizes="(max-width: 1024px) 100vw, 65vw"
          />
        </Link>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.category ? (
              <Link href={`/category/${item.category.slug}`} className="relative z-10">
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {item.category.name}
                </Badge>
              </Link>
            ) : null}
            {item.publishedAt ? (
              <span className="relative z-10 text-xs text-muted-foreground">
                {formatDateTime(item.publishedAt)}
              </span>
            ) : null}
          </div>

          <h2 className="jn-headline text-2xl font-semibold leading-tight group-hover:underline">
            {item.title}
          </h2>

          {item.lead ? (
            <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
              {item.lead}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function NewsCardRow({ item }: { item: NewsCardItem }) {
  return (
    <article className="group relative border-b py-5">
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0" aria-label={item.title} />
      <div className="grid gap-4 sm:grid-cols-[220px,1fr]">
        <Link href={`/news/${item.slug}`} className="relative z-10 block">
          <Cover src={item.coverImage} alt={item.title} className="aspect-[16/10]" sizes="(max-width: 640px) 100vw, 220px" />
        </Link>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.category ? (
              <Link href={`/category/${item.category.slug}`} className="relative z-10">
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {item.category.name}
                </Badge>
              </Link>
            ) : null}
            {item.publishedAt ? (
              <span className="relative z-10 text-xs text-muted-foreground">
                {formatDateTime(item.publishedAt)}
              </span>
            ) : null}
            {item.author ? (
              <span className="relative z-10 text-xs text-muted-foreground">
                • {item.author.name}
              </span>
            ) : null}
          </div>

          <h3 className="jn-headline text-lg font-semibold leading-snug group-hover:underline">
            {item.title}
          </h3>

          {item.lead ? (
            <p className="text-sm leading-6 text-muted-foreground line-clamp-2">
              {item.lead}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function NewsCardMedium({ item }: { item: NewsCardItem }) {
  return (
    <article className="group relative flex gap-3">
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0" aria-label={item.title} />
      <Link href={`/news/${item.slug}`} className="relative z-10 shrink-0 block">
        <Cover
          src={item.coverImage}
          alt={item.title}
          className="w-28 h-[76px] sm:w-32 sm:h-[84px]"
          sizes="128px"
        />
      </Link>
      <div className="min-w-0 flex flex-col gap-1">
        {item.category ? (
          <Link href={`/category/${item.category.slug}`} className="relative z-10 w-fit">
            <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
              {item.category.name}
            </Badge>
          </Link>
        ) : null}
        <h3 className="jn-headline text-sm font-semibold leading-snug group-hover:underline line-clamp-2">
          {item.title}
        </h3>
        {item.publishedAt ? (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(item.publishedAt)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function NewsCardGrid({ item }: { item: NewsCardItem }) {
  return (
    <article className="group">
      <Link href={`/news/${item.slug}`} className="grid gap-2">
        <Cover
          src={item.coverImage}
          alt={item.title}
          className="aspect-[16/9]"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.category ? (
              <Badge variant="secondary" className="text-xs">
                {item.category.name}
              </Badge>
            ) : null}
            {item.publishedAt ? (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(item.publishedAt)}
              </span>
            ) : null}
          </div>
          <h3 className="jn-headline text-sm font-semibold leading-snug group-hover:underline line-clamp-2">
            {item.title}
          </h3>
        </div>
      </Link>
    </article>
  );
}

export function NewsCardSmall({
  item,
  index,
}: {
  item: NewsCardItem;
  index?: number;
}) {
  return (
    <article className="group">
      <Link href={`/news/${item.slug}`} className="grid gap-1">
        <div className="flex items-start gap-2">
          {typeof index === "number" ? (
            <span className="mt-[2px] w-6 shrink-0 text-right text-xs font-semibold text-primary">
              {index + 1}
            </span>
          ) : null}
          <h4 className="jn-headline text-sm font-semibold leading-snug group-hover:underline">
            {item.title}
          </h4>
        </div>
        {item.publishedAt ? (
          <span className={cn("text-xs text-muted-foreground", typeof index === "number" ? "ml-8" : "")}>
            {formatDateTime(item.publishedAt)}
          </span>
        ) : null}
      </Link>
    </article>
  );
}
