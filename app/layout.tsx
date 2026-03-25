import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_NAME, getBaseUrl } from "@/lib/site";
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

export async function generateMetadata(): Promise<Metadata> {
  const faviconSetting = await prisma.siteSetting.findUnique({ where: { key: "favicon" } }).catch(() => null);
  const hasFavicon = !!faviconSetting?.value;

  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    icons: hasFavicon
      ? { icon: "/api/favicon", shortcut: "/api/favicon", apple: "/api/favicon" }
      : undefined,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={cn(fontSans.variable, fontSerif.variable, "antialiased")}>
        <Providers>
          {children}
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
