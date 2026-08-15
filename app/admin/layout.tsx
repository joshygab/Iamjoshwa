import Link from "next/link";
import type React from "react";
import { Archive, Bell, CalendarDays, Camera, Disc3, FileText, Flag, Gauge, Home, ImageIcon, Instagram, LayoutDashboard, ListTree, LockKeyhole, Megaphone, Music, Palette, Search, Settings, Shield, Sparkles, Tags, Ticket, ToggleLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

const groups = [
  { title: "Overview", items: [["Dashboard", "/admin", <LayoutDashboard key="dashboard" />], ["Search", "/admin/search", <Search key="search" />]] },
  { title: "Content", items: [["Home Builder", "/admin/home-builder", <Home key="home" />], ["Shows", "/admin/eventos", <CalendarDays key="shows" />], ["Music", "/admin/sets", <Music key="sets" />], ["Releases", "/admin/lanzamientos", <Disc3 key="releases" />], ["Vault", "/admin/recompensas", <LockKeyhole key="vault" />], ["Media", "/admin/media", <ImageIcon key="media" />], ["History", "/admin/historia", <Camera key="history" />]] },
  { title: "Community", items: [["Members", "/admin/usuarios", <Users key="members" />], ["Josh Pass", "/admin/comunidad", <Sparkles key="pass" />], ["Pass Levels", "/admin/pass-levels", <Flag key="levels" />], ["Badges", "/admin/insignias", <Sparkles key="badges" />], ["Missions", "/admin/puntos", <Gauge key="missions" />], ["Rewards", "/admin/recompensas", <Ticket key="rewards" />], ["Check-ins", "/admin/checkins", <Bell key="checkins" />], ["Referrals", "/admin/referidos", <Users key="referrals" />]] },
  { title: "Business", items: [["Booking", "/admin/booking", <Ticket key="booking" />], ["Availability", "/admin/disponibilidad", <CalendarDays key="availability" />], ["EPK", "/admin/epk", <FileText key="epk" />]] },
  { title: "Website", items: [["Sections", "/admin/sections", <ListTree key="sections" />], ["Navigation", "/admin/navigation", <ToggleLeft key="navigation" />], ["Content & Labels", "/admin/labels", <Tags key="labels" />], ["Announcement", "/admin/announcements", <Megaphone key="announcement" />], ["Theme", "/admin/theme", <Palette key="theme" />], ["SEO", "/admin/seo", <Search key="seo" />], ["Social Links", "/admin/redes-sociales", <Instagram key="social" />]] },
  { title: "System", items: [["Presets", "/admin/presets", <Archive key="presets" />], ["System Controls", "/admin/system", <Shield key="system" />], ["Audit Log", "/admin/audit-log", <ListTree key="audit" />], ["Settings", "/admin/configuracion", <Settings key="settings" />], ["Campaigns", "/admin/campanas", <Bell key="campaigns" />]] },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireRole(["editor", "admin"]);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar control-room-sidebar">
        <div className="admin-brand">
          <span className="wordmark">IAMJOSHWA</span>
          <small>CONTROL ROOM · {role.toUpperCase()}</small>
        </div>
        <nav aria-label="Admin">
          {groups.map((group) => (
            <section key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([label, href, icon]) => (
                <Link href={href} key={href}>{icon}<span>{label}</span></Link>
              ))}
            </section>
          ))}
        </nav>
        <Link href="/" className="button secondary">Ver sitio</Link>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
