import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { saveFaviconAction, deleteFaviconAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const faviconSetting = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  const faviconUrl = faviconSetting?.value ?? null;

  return (
    <div className="grid gap-6 max-w-xl">
      <div>
        <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Настройки внешнего вида сайта.</p>
      </div>

      <div className="rounded-md border p-6 grid gap-4">
        <h2 className="font-semibold">Favicon</h2>

        {faviconUrl ? (
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted">
              <Image src={faviconUrl} alt="favicon" fill className="object-contain p-1" />
            </div>
            <span className="text-sm text-muted-foreground truncate max-w-[240px]">{faviconUrl}</span>
            <form action={deleteFaviconAction}>
              <button
                type="submit"
                className="text-sm text-destructive hover:underline"
              >
                Удалить
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Favicon не установлен — используется стандартный значок.</p>
        )}

        <form action={saveFaviconAction} className="grid gap-3">
          <label className="text-sm font-medium">
            {faviconUrl ? "Заменить favicon" : "Загрузить favicon"}
          </label>
          <p className="text-xs text-muted-foreground">Рекомендуемый размер: 32×32 или 64×64 пикселей. Форматы: PNG, ICO, WebP.</p>
          <div className="flex gap-2">
            <input
              type="file"
              name="favicon"
              accept="image/png,image/x-icon,image/webp,image/jpeg"
              required
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
