import { saveAnnouncement } from "../actions";
import { requireRole } from "@/lib/auth/require-role";

export default async function AnnouncementsAdmin() {
  const { supabase } = await requireRole(["editor", "admin"]);
  const { data } = await supabase.from("announcements").select("*").order("position");
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">SIGNAL BAR</span><h1>Announcement</h1><p>Crea mensajes globales programados: show, release, Vault, tickets o mantenimiento suave.</p></div></header>
      <section className="control-room-grid">
        <div className="settings-card control-room-form"><AnnouncementForm /></div>
        <div className="settings-card">{(data || []).map((item) => <article className="cms-control-row" key={item.id}><div><strong>{item.eyebrow || "NEW SIGNAL"} · {item.title}</strong><small>{item.starts_at ? new Date(item.starts_at).toLocaleString("es-MX") : "Sin inicio"} → {item.ends_at ? new Date(item.ends_at).toLocaleString("es-MX") : "Sin fin"}</small></div><span data-status={item.status}>{item.status}</span><AnnouncementForm item={item} compact /></article>)}</div>
      </section>
    </>
  );
}

function AnnouncementForm({ item, compact = false }: { item?: Record<string, unknown>; compact?: boolean }) {
  return (
    <details className={compact ? "cms-inline-editor" : undefined} open={!compact}>
      <summary>{compact ? "Edit" : "Nuevo announcement"}</summary>
      <form action={saveAnnouncement} className="control-room-fields">
        <input type="hidden" name="id" value={String(item?.id || "")} />
        <label>Eyebrow<input name="eyebrow" defaultValue={String(item?.eyebrow || "NEW SIGNAL")} /></label>
        <label>Title<input name="title" defaultValue={String(item?.title || "")} required /></label>
        <label>Text<textarea name="body" rows={3} defaultValue={String(item?.body || "")} /></label>
        <label>CTA<input name="ctaLabel" defaultValue={String(item?.cta_label || "")} /></label>
        <label>URL<input name="ctaHref" defaultValue={String(item?.cta_href || "")} /></label>
        <label>Universo<select name="project" defaultValue={String(item?.project || "")}><option value="">Ambos</option><option value="iamjoshwa">IAMJOSHWA</option><option value="afterluv">AFTERLUV</option></select></label>
        <label>Audience<select name="audience" defaultValue={String(item?.audience || "all")}><option value="all">All</option><option value="visitors">Visitors</option><option value="members">Members</option><option value="pass">Josh Pass</option><option value="admins">Admins</option></select></label>
        <label>Status<select name="status" defaultValue={String(item?.status || "draft")}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>
        <label>Show from<input name="startsAt" type="datetime-local" /></label>
        <label>Hide after<input name="endsAt" type="datetime-local" /></label>
        <label>Orden<input name="position" type="number" defaultValue={String(item?.position || 0)} /></label>
        <button className="button primary">Guardar announcement</button>
      </form>
    </details>
  );
}
