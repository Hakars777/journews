import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationLinks } from "@/components/site/pagination";
import { getAdminMediaPageData } from "@/lib/admin-cache";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getFreeTierBytes } from "@/lib/r2-media";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function UsageBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone =
    clamped >= 90 ? "bg-destructive" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${tone}`}
        style={{ width: `${Math.max(clamped, clamped > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = parsePage(searchParams?.page);
  const { skip, take } = getPagination(page, PAGE_SIZE);
  const overview = await getAdminMediaPageData();
  const freeTierLabel = formatBytes(getFreeTierBytes());

  if (overview.status === "disabled") {
    return (
      <div className="grid gap-6 max-w-3xl">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gallery and storage usage are available when the site uses Cloudflare R2.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Media storage is not on R2</CardTitle>
            <CardDescription>
              Current provider: <span className="font-medium text-foreground">{overview.provider}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Switch <code>MEDIA_STORAGE_PROVIDER</code> to <code>r2</code> to see the gallery,
            usage counter, and free-tier progress here.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (overview.status === "misconfigured") {
    return (
      <div className="grid gap-6 max-w-3xl">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            R2 is selected, but the gallery could not load because the storage config is incomplete.
          </p>
        </div>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>R2 configuration error</CardTitle>
            <CardDescription>{overview.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalPages = pageCount(overview.items.length, PAGE_SIZE);
  const galleryItems = overview.items.slice(skip, skip + take);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Media</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cloudflare R2 gallery with a live view of used storage and remaining free space.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={overview.usagePercent >= 90 ? "destructive" : "secondary"}>
            {overview.usagePercent.toFixed(1)}% of free tier used
          </Badge>
          <Badge variant="outline">{overview.objectCount} files</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Usage overview
          </CardTitle>
          <CardDescription>
            Bucket <span className="font-medium text-foreground">{overview.bucket}</span> on{" "}
            <Link href={overview.publicUrl} target="_blank" className="underline underline-offset-4">
              {overview.publicUrl}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Used now</div>
              <div className="mt-1 text-2xl font-semibold">{formatBytes(overview.totalBytes)}</div>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Free left</div>
              <div className="mt-1 text-2xl font-semibold">
                {formatBytes(overview.remainingFreeBytes)}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Images</div>
              <div className="mt-1 text-2xl font-semibold">{overview.imageCount}</div>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Last upload</div>
              <div className="mt-1 text-base font-semibold">
                {overview.lastUploadAt ? formatDateTime(overview.lastUploadAt) : "No uploads yet"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <span className="font-medium">
                  {formatBytes(overview.totalBytes)} used out of {freeTierLabel}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  • {overview.objectCount} files in bucket
                </span>
              </div>
              <div className="text-sm font-medium">{overview.usagePercent.toFixed(1)}%</div>
            </div>
            <div className="mt-3">
              <UsageBar percent={overview.usagePercent} />
            </div>
          </div>

          {overview.folders.length ? (
            <div className="flex flex-wrap gap-2">
              {overview.folders.map((folder) => (
                <div
                  key={folder.name}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{folder.name}</span>
                  <span className="text-muted-foreground">{formatBytes(folder.bytes)}</span>
                  <span className="text-xs text-muted-foreground">{folder.files} files</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Folders will appear here after the first upload reaches R2.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Gallery
          </CardTitle>
          <CardDescription>
            Изображения из R2 с постраничным выводом. Всего: {overview.items.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {galleryItems.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {galleryItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.url}
                  target="_blank"
                  className="group overflow-hidden rounded-2xl border bg-background transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={item.url}
                      alt={item.key}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="grid gap-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{item.folder}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(item.size)}</span>
                    </div>
                    <div className="truncate text-sm font-medium">{item.key.split("/").pop()}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.lastModified ? formatDateTime(item.lastModified) : "Unknown upload time"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              The bucket is connected, but there are no images to show yet.
            </div>
          )}
          <div className="mt-6">
            <PaginationLinks
              page={page}
              totalPages={totalPages}
              buildHref={(nextPage) => (nextPage > 1 ? `/admin/media?page=${nextPage}` : "/admin/media")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
