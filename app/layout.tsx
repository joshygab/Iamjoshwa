import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { UniverseProvider } from "@/components/universe-provider";
import { PlayerProvider } from "@/components/player-provider";
import { PwaRegister } from "@/components/pwa-register";
import { contentRepository } from "@/lib/data";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IAMJOSHWA — DJ & Producer CDMX",
    template: "%s | IAMJOSHWA",
  },
  description: "IAMJOSHWA WORLD: shows, music, Inner Circle Pass, The Vault, EPK, booking and AFTERLUV.",
  applicationName: "IAMJOSHWA",
  manifest: "/manifest.webmanifest",
  keywords: ["IAMJOSHWA", "AFTERLUV", "DJ CDMX", "House", "Tech House", "Hard Trance", "Booking DJ"],
  authors: [{ name: "IAMJOSHWA" }],
  creator: "IAMJOSHWA",
  alternates: { canonical: "/" },
  category: "music",
  openGraph: {
    title: "IAMJOSHWA — DJ & Producer CDMX",
    description: "Enter IAMJOSHWA WORLD: music, shows, Inner Circle Pass, The Vault, EPK, booking and AFTERLUV.",
    type: "website",
    locale: "es_MX",
    siteName: "IAMJOSHWA",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "IAMJOSHWA DJ & Producer CDMX" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IAMJOSHWA — DJ & Producer CDMX",
    description: "Enter IAMJOSHWA WORLD: music, shows, Inner Circle Pass, The Vault, EPK, booking and AFTERLUV.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "IAMJOSHWA",
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/splash/ios-1179x2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/ios-1290x2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/ios-2048x2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [{ url: "/favicon.svg" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "IAMJOSHWA",
    "msapplication-TileColor": "#050505",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: "#070609",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [navigation, announcements, publicSettings] = await Promise.all([
    contentRepository.getNavigation().catch(() => []),
    contentRepository.getAnnouncements().catch(() => []),
    contentRepository.getPublicSettings().catch(() => ({})),
  ]);
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <UniverseProvider>
          <PlayerProvider>
            <PwaRegister />
            <SiteShell navigation={navigation} announcements={announcements} publicSettings={publicSettings}>{children}</SiteShell>
          </PlayerProvider>
        </UniverseProvider>
      </body>
    </html>
  );
}
