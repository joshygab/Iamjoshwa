import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { UniverseProvider } from "@/components/universe-provider";
import { PlayerProvider } from "@/components/player-provider";
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
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [{ url: "/favicon.svg" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070609",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <UniverseProvider>
          <PlayerProvider>
            <SiteShell>{children}</SiteShell>
          </PlayerProvider>
        </UniverseProvider>
      </body>
    </html>
  );
}
