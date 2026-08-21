"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Disc3, FileText, Headphones, Home, ImageIcon, LockKeyhole, Sparkles, Ticket, X, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ImmersiveEffects } from "./immersive-effects";
import { UniverseSwitch } from "./universe-switch";
import { CommandMenu } from "./command-menu";
import { SocialIconRail } from "./social-icon-rail";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { systemEnabled, systemMessage } from "@/lib/cms/labels";
import { useUniverse } from "./universe-provider";
import type { AnnouncementItem, NavigationItem, PublicSettings } from "@/types/content";

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

export function SiteShell({ children, navigation = [], announcements = [], publicSettings = {} }: { children: React.ReactNode; navigation?: NavigationItem[]; announcements?: AnnouncementItem[]; publicSettings?: PublicSettings }) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState<{ name: string; points: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { universe } = useUniverse();
  const nav = (navigation.length ? navigation : fallbackNav).filter((item) => !item.project || item.project === universe).sort((a, b) => a.position - b.position);
  const headerNav = nav.filter((item) => item.showInNavbar !== false);
  const footerNav = nav.filter((item) => item.showInFooter);
  const bottomNav = mobileDockItems(headerNav.filter((item) => item.showOnMobile !== false));
  const announcement = systemEnabled(publicSettings, "hide_announcements") ? null : announcements.find((item) => !item.project || item.project === universe) || null;
  const maintenance = systemEnabled(publicSettings, "maintenance_mode");
  const active = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));
  const worldMode = appModeLabel(pathname);
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

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (pathname.startsWith("/admin")) return <>{children}</>;
  if (maintenance && !pathname.startsWith("/acceso")) {
    return (
      <>
        <ImmersiveEffects />
        <main id="contenido" className="maintenance-screen">
          <span>SIGNAL INTERRUPTED</span>
          <h1>IAMJOSHWA WORLD</h1>
          <p>{systemMessage(publicSettings, "maintenance_mode", "IAMJOSHWA WORLD is currently being updated.")}</p>
          <Link className="button primary" href="/acceso?next=%2Fadmin">Admin access</Link>
        </main>
      </>
    );
  }

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
      <aside className="world-status-panel" aria-label="Estado actual de IAMJOSHWA World">
        <span>WORLD STATUS</span>
        <strong>{worldMode}</strong>
        <small>{universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA"} · ONLINE</small>
      </aside>
      <header className={`topbar ${scrolled ? "is-compact" : ""}`}>
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
        {(bottomNav.length ? bottomNav : mobileDockItems(fallbackNav)).map((item) => (
          <Link href={item.href} key={item.href} aria-current={active(item.href) ? "page" : undefined} data-dock-item={dockKey(item)}>
            <NavIcon item={item} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

function appModeLabel(pathname: string) {
  if (pathname === "/") return "MAIN SIGNAL";
  if (pathname.startsWith("/fechas")) return "SHOW MODE";
  if (pathname.startsWith("/musica")) return "LISTEN MODE";
  if (pathname.startsWith("/lanzamientos")) return "RELEASE MODE";
  if (pathname.startsWith("/the-vault")) return "VAULT MODE";
  if (pathname.startsWith("/comunidad") || pathname.startsWith("/perfil") || pathname.startsWith("/pass")) return "PASS MODE";
  if (pathname.startsWith("/booking")) return "BOOKING MODE";
  if (pathname.startsWith("/epk")) return "EPK MODE";
  if (pathname.startsWith("/checkin")) return "CHECK-IN MODE";
  return "WORLD MODE";
}

function mobileDockItems(items: NavigationItem[]) {
  const find = (tests: Array<(item: NavigationItem) => boolean>, fallback: NavigationItem) => {
    const item = items.find((candidate) => tests.some((test) => test(candidate))) || fallback;
    return { ...item };
  };
  const home = find([((item) => item.href === "/")], fallbackNav[0]);
  const shows = find([((item) => item.href.startsWith("/fechas")), ((item) => /fecha|show/i.test(item.label))], fallbackNav[1]);
  const music = find([((item) => item.href.startsWith("/musica")), ((item) => /m[uú]sica|music|listen/i.test(item.label))], fallbackNav[2]);
  const community = find([((item) => item.href.startsWith("/comunidad")), ((item) => /comunidad|pass|community/i.test(item.label))], fallbackNav[7]);
  const booking = find([((item) => item.href.startsWith("/booking")), ((item) => /booking|book/i.test(item.label))], { label: "Booking", href: "/booking", position: 999, project: null, showInNavbar: true, showInFooter: true, showOnDesktop: true, showOnMobile: true });
  return [
    { ...home, label: "Inicio" },
    { ...shows, label: "Fechas" },
    { ...music, label: "Listen" },
    { ...community, label: "Pass" },
    { ...booking, label: "Booking" },
  ];
}

function dockKey(item: NavigationItem) {
  const key = `${item.href} ${item.label}`.toLowerCase();
  if (key.includes("/musica") || key.includes("listen") || key.includes("music")) return "listen";
  if (key.includes("/fechas") || key.includes("fecha") || key.includes("show")) return "shows";
  if (key.includes("/comunidad") || key.includes("pass")) return "pass";
  if (key.includes("/booking") || key.includes("book")) return "booking";
  return "home";
}

function NavIcon({ item }: { item: NavigationItem }) {
  const key = `${item.icon || ""} ${item.href} ${item.label}`.toLowerCase();
  if (key.includes("fecha") || key.includes("show") || key.includes("calendar")) return <CalendarDays />;
  if (key.includes("music") || key.includes("musica") || key.includes("listen") || key.includes("set")) return <Headphones />;
  if (key.includes("release") || key.includes("lanzamiento") || key.includes("disc")) return <Disc3 />;
  if (key.includes("vault") || key.includes("lock")) return <LockKeyhole />;
  if (key.includes("pass") || key.includes("comunidad") || key.includes("spark")) return <Sparkles />;
  if (key.includes("booking") || key.includes("ticket") || key.includes("book")) return <Ticket />;
  if (key.includes("media") || key.includes("image")) return <ImageIcon />;
  if (key.includes("epk") || key.includes("file")) return <FileText />;
  return <Home />;
}
