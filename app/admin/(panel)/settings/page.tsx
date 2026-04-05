import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormSubmitButton } from "@/components/admin/form-submit-button";
import { BreakingTickerSettingsForm } from "@/components/admin/settings/breaking-ticker-settings-form";
import { FaviconForm } from "@/components/admin/settings/favicon-form";
import { MobileHeadlineSizeForm } from "@/components/admin/settings/mobile-headline-size-form";
import { prisma } from "@/lib/prisma";
import {
  MOBILE_ARTICLE_TITLE_SCALE,
  SITE_NAME,
  SITE_DESCRIPTION,
  TICKER_LABEL,
  TICKER_SPEED_SECONDS,
} from "@/lib/site";
import {
  saveFaviconAction,
  deleteFaviconAction,
  saveSiteNameAction,
  saveSiteDescriptionAction,
  saveBreakingTickerSettingsAction,
  saveMobileArticleTitleScaleAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const rows = await prisma.siteSetting
    .findMany({
      where: {
        key: {
          in: [
            "favicon",
            "site_name",
            "site_description",
            "mobile_article_title_scale",
            "ticker_label",
            "ticker_speed_seconds",
          ],
        },
      },
    })
    .catch(() => []);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const faviconUrl = map["favicon"] ?? null;
  const siteName = map["site_name"] ?? SITE_NAME;
  const siteDescription = map["site_description"] ?? SITE_DESCRIPTION;
  const mobileArticleTitleScale = Number(map["mobile_article_title_scale"] ?? MOBILE_ARTICLE_TITLE_SCALE);
  const tickerLabel = (map["ticker_label"] ?? TICKER_LABEL).trim() || TICKER_LABEL;
  const tickerSpeedSeconds = Number(map["ticker_speed_seconds"] ?? TICKER_SPEED_SECONDS);
  const successMessageByKey: Record<string, string> = {
    name: "Название сайта сохранено.",
    description: "Описание сайта сохранено.",
    mobile_title_scale: "Размер мобильного заголовка сохранён.",
    ticker: "Настройки бегущей строки сохранены.",
    favicon: "Favicon сохранён.",
    favicon_deleted: "Favicon удалён.",
  };
  const successMessage = searchParams?.saved ? successMessageByKey[searchParams.saved] ?? null : null;

  return (
    <div className="grid gap-6 max-w-xl">
      {successMessage ? (
        <Alert>
          <AlertTitle>Готово</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Настройки внешнего вида и метаданных сайта.</p>
      </div>

      {/* Название сайта */}
      <div className="rounded-md border p-6 grid gap-4">
        <h2 className="font-semibold">Название сайта</h2>
        <form action={saveSiteNameAction} className="grid gap-3">
          <input
            type="text"
            name="site_name"
            defaultValue={siteName}
            required
            maxLength={80}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div>
            <FormSubmitButton idleLabel="Сохранить" />
          </div>
        </form>
      </div>

      {/* Описание сайта */}
      <div className="rounded-md border p-6 grid gap-4">
        <h2 className="font-semibold">Описание сайта</h2>
        <p className="text-xs text-muted-foreground">Используется в мета-тегах и RSS. До 160 символов.</p>
        <form action={saveSiteDescriptionAction} className="grid gap-3">
          <textarea
            name="site_description"
            defaultValue={siteDescription}
            required
            maxLength={160}
            rows={3}
            className="rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
          <div>
            <FormSubmitButton idleLabel="Сохранить" />
          </div>
        </form>
      </div>

      <MobileHeadlineSizeForm
        initialValue={Number.isFinite(mobileArticleTitleScale) ? Math.max(70, Math.min(100, Math.round(mobileArticleTitleScale))) : MOBILE_ARTICLE_TITLE_SCALE}
        saveAction={saveMobileArticleTitleScaleAction}
      />

      <BreakingTickerSettingsForm
        initialLabel={tickerLabel}
        initialSpeed={Number.isFinite(tickerSpeedSeconds) ? Math.max(20, Math.min(120, Math.round(tickerSpeedSeconds))) : TICKER_SPEED_SECONDS}
        saveAction={saveBreakingTickerSettingsAction}
      />

      <FaviconForm
        initialFaviconUrl={faviconUrl}
        saveAction={saveFaviconAction}
        deleteAction={deleteFaviconAction}
      />
    </div>
  );
}
