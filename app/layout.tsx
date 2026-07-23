import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/site-shell";
import { UniverseProvider } from "@/components/universe-provider";
import { PlayerProvider } from "@/components/player-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = { metadataBase: new URL(siteUrl), title: { default: "IAMJOSHWA — DJ & Producer CDMX", template: "%s | IAMJOSHWA" }, description: "Sitio oficial de IAMJOSHWA y AFTERLUV: fechas, sets, lanzamientos, EPK y booking.", applicationName:"IAMJOSHWA",keywords:["IAMJOSHWA","AFTERLUV","DJ CDMX","House","Hard Trance"],authors:[{name:"IAMJOSHWA"}],creator:"IAMJOSHWA",openGraph: { title: "IAMJOSHWA — DJ & Producer CDMX", description: "Dos universos. Una misma frecuencia.", type: "website", locale: "es_MX",siteName:"IAMJOSHWA",images:[{url:"/images/brand/iamjoshwa-hero.webp",width:1536,height:1024,alt:"Identidad visual abstracta de IAMJOSHWA"}] }, twitter: { card: "summary_large_image",images:["/images/brand/iamjoshwa-hero.webp"] }, robots: { index: true, follow: true },icons:{icon:"/favicon.svg"} };
export const viewport: Viewport = { themeColor: "#070609", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-scroll-behavior="smooth"><body><UniverseProvider><PlayerProvider><SiteShell>{children}</SiteShell></PlayerProvider></UniverseProvider></body></html>;
}
