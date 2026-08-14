"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Headphones, Home, Sparkles, Ticket, X, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ImmersiveEffects } from "./immersive-effects";
import { UniverseSwitch } from "./universe-switch";
import { CommandMenu } from "./command-menu";
import { SocialIconRail } from "./social-icon-rail";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { AnnouncementItem, NavigationItem } from "@/types/content";

const fallbackNav: NavigationItem[] = [
  { label: "Inicio", href: "/", position: 0, project: null, showInNavbar: true, showInFooter: false, showOnDesktop: true, showOnMobile: true },
  { label: "Fechas", href: "/fechas", position: 10, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "Música", href: "/musica", position: 20, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "Lanzamientos", href: "/lanzamientos", position: 30, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "The Vault", href: "/the-vault", position: 40, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "Media", href: "/media", position: 50, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "Historia", href: "/historia", position: 60, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "Comunidad", href: "/comunidad", position: 70, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
  { label: "EPK", href: "/epk", position: 80, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true },
];

export function SiteShell({ children, navigation = [], announcement }: { children: React.ReactNode; navigation?: NavigationItem[]; announcement?: AnnouncementItem | null }) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState<{ name: string; points: number } | null>(null);
  const pathname = usePathname();
  const nav = (navigation.length ? navigation : fallbackNav).sort((a, b) => a.position - b.position);
  const headerNav = nav.filter((item) => item.showInNavbar !== false);
  const footerNav = nav.filter((item) => item.showInFooter);
  const active = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));
  const close = () => setOpen(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPassSignal() {
      if (!isSupabaseConfigured) return;
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user || cancelled) return;
      const [{ data: profile }, { data: pointTotal }] = await Promise.all([
        db.from("profiles").select("display_name,public_alias").eq("id", user.id).maybeSingle(),
        db.from("fan_point_totals").select("points").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setPass({
        name: String(profile?.public_alias || profile?.display_name || user.email?.split("@")[0] || "JOSH").slice(0, 12).toUpperCase(),
        points: Number(pointTotal?.points || 0),
      });
    }
    void loadPassSignal();
    return () => {
      cancelled = true;
    };
  }, []);

  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <ImmersiveEffects />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      {announcement ? (
        <aside className="signal-announcement-bar" aria-label="Announcement">
          <span>{announcement.eyebrow || "NEW SIGNAL"}</span>
          <strong>{announcement.title}</strong>
          {announcement.body ? <p>{announcement.body}</p> : null}
          {announcement.ctaHref ? <Link href={announcement.ctaHref}>{announcement.ctaLabel || "Open"}</Link> : null}
        </aside>
      ) : null}
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="IAMJOSHWA, inicio">
          IAMJOSHWA<span>®</span>
        </Link>
        <nav className="desktop-nav" aria-label="Principal">
          {headerNav.filter((item) => item.showOnDesktop !== false).map(({ label, href, target, badge }) => (
            <Link key={href} href={href} target={target === "_blank" ? "_blank" : undefined} rel={target === "_blank" ? "noreferrer" : undefined} aria-current={active(href) ? "page" : undefined}>{label}{badge ? <span>{badge}</span> : null}</Link>
          ))}
        </nav>
        <CommandMenu />
        <UniverseSwitch />
        <Link className="pass-signal-chip" href={pass ? "/perfil" : "/acceso?next=%2Fperfil"} aria-label={pass ? `Abrir Josh Pass de ${pass.name}` : "Crear Josh Pass"}>
          <Sparkles />
          <span>{pass ? `${pass.name} · LISTENER` : "PASS"}</span>
          {pass ? <strong>{String(pass.points).padStart(3, "0")} XP</strong> : null}
        </Link>
        <Link className="nav-book-now" href="/booking" aria-current={active("/booking") ? "page" : undefined}>
          Book Now
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Cerrar menú" : "Abrir menú"}>
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open ? (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Menú móvil">
          {headerNav.filter((item) => item.showOnMobile !== false).map(({ label, href, target }) => (
            <Link key={href} href={href} target={target === "_blank" ? "_blank" : undefined} rel={target === "_blank" ? "noreferrer" : undefined} onClick={close} aria-current={active(href) ? "page" : undefined}>{label}</Link>
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
          {footerNav.length ? <nav className="footer-nav" aria-label="Footer">{footerNav.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav> : null}
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
