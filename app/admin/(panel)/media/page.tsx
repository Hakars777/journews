import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getAdminMediaOverview, getFreeTierBytes } from "@/lib/r2-media";

export const dynamic = "force-dynamic";

function UsageBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone =
    clamped >= 90 ? "bg-destructive" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-3 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${tone}`}
        style={{ width: `${Math.max(clamped, clamped > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

export default async function AdminMediaPage() {
  const overview = await getAdminMediaOverview();
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Used now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatBytes(overview.totalBytes)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Current size of the R2 bucket</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Free left</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatBytes(overview.remainingFreeBytes)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Remaining before {freeTierLabel}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{overview.imageCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Previewable items in the bucket</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {overview.lastUploadAt ? formatDateTime(overview.lastUploadAt) : "No uploads yet"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Latest object visible in R2</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
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
        <CardContent className="grid gap-6">
          <div className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">
                  {formatBytes(overview.totalBytes)} used out of {freeTierLabel}
                </div>
                <div className="text-sm text-muted-foreground">
                  Free tier is based on stored size. This is the current bucket size, not just uploads made this month.
                </div>
              </div>
              <div className="text-sm font-medium">{overview.usagePercent.toFixed(1)}%</div>
            </div>
            <div className="mt-4">
              <UsageBar percent={overview.usagePercent} />
            </div>
          </div>

          {overview.folders.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {overview.folders.map((folder) => (
                <div key={folder.name} className="rounded-xl border bg-background p-4">
                  <div className="text-sm font-medium">{folder.name}</div>
                  <div className="mt-1 text-2xl font-semibold">{formatBytes(folder.bytes)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{folder.files} files</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Folders will appear here after the first upload reaches R2.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="jn-headline text-base font-semibold uppercase tracking-wide">
            Recent gallery
          </CardTitle>
          <CardDescription>
            Latest {overview.items.length} images from R2. Open any item to inspect the original file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {overview.items.map((item) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
