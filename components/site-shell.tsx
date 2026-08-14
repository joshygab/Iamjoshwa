"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Headphones, Home, Sparkles, Ticket, X, Menu } from "lucide-react";
import { useState } from "react";
import { ImmersiveEffects } from "./immersive-effects";
import { UniverseSwitch } from "./universe-switch";
import { CommandMenu } from "./command-menu";
import { SocialIconRail } from "./social-icon-rail";

const nav = [
  ["Inicio", "/"],
  ["Fechas", "/fechas"],
  ["Música", "/musica"],
  ["Lanzamientos", "/lanzamientos"],
  ["The Vault", "/the-vault"],
  ["Media", "/media"],
  ["Historia", "/historia"],
  ["Comunidad", "/comunidad"],
  ["EPK", "/epk"],
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  const active = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));
  const close = () => setOpen(false);

  return (
    <>
      <ImmersiveEffects />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="IAMJOSHWA, inicio">
          IAMJOSHWA<span>®</span>
        </Link>
        <nav className="desktop-nav" aria-label="Principal">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <CommandMenu />
        <UniverseSwitch />
        <Link className="nav-book-now" href="/booking" aria-current={active("/booking") ? "page" : undefined}>
          Book Now
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Cerrar menú" : "Abrir menú"}>
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open ? (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Menú móvil">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} onClick={close} aria-current={active(href) ? "page" : undefined}>{label}</Link>
          ))}
          <Link className="mobile-book-now" href="/booking" onClick={close} aria-current={active("/booking") ? "page" : undefined}>Book Now</Link>
        </nav>
      ) : null}
      <main id="contenido">{children}</main>
      <footer>
        <div>
          <span className="wordmark">IAMJOSHWA</span>
          <p>DJ & Producer — Ciudad de México</p>
          <SocialIconRail />
        </div>
        <p>© {new Date().getFullYear()} IAMJOSHWA. Sitio oficial.</p>
      </footer>
      <nav className="bottom-nav premium-bottom-nav" aria-label="Accesos rápidos">
        <Link href="/" aria-current={active("/") ? "page" : undefined}>
          <Home />
          <span>Inicio</span>
        </Link>
        <Link href="/fechas" aria-current={active("/fechas") ? "page" : undefined}>
          <CalendarDays />
          <span>Shows</span>
        </Link>
        <Link href="/musica" aria-current={active("/musica") ? "page" : undefined}>
          <Headphones />
          <span>Listen</span>
        </Link>
        <Link href="/acceso" aria-current={active("/acceso") || active("/perfil") ? "page" : undefined}>
          <Sparkles />
          <span>Pass</span>
        </Link>
        <Link href="/booking" aria-current={active("/booking") ? "page" : undefined}>
          <Ticket />
          <span>Booking</span>
        </Link>
      </nav>
    </>
  );
}
