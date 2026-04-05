import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { getBaseUrl, getSiteSettings } from "@/lib/site";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const fontSans = Noto_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Noto_Serif({
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
  display: "swap",
});

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [faviconSetting, settings] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "favicon" } }).catch(() => null),
    getSiteSettings(),
  ]);
  const faviconV = faviconSetting?.updatedAt
    ? `?v=${new Date(faviconSetting.updatedAt).getTime()}`
    : "";
  const faviconUrl = faviconSetting?.value ? `/api/favicon${faviconV}` : null;

  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: settings.name,
      template: `%s | ${settings.name}`,
    },
    description: settings.description,
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : undefined,
    openGraph: {
      type: "website",
      siteName: settings.name,
      title: settings.name,
      description: settings.description,
      locale: "hy_AM",
    },
    twitter: {
      card: "summary_large_image",
      title: settings.name,
      description: settings.description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hy" suppressHydrationWarning>
      <body className={cn(fontSans.variable, fontSerif.variable, "antialiased")}>
        <Providers>
          {children}
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
