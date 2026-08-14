import { archiveSiteSection, saveSiteSection } from "../actions";
import { requireRole } from "@/lib/auth/require-role";

const statuses = ["draft", "published", "hidden", "coming_soon", "members_only", "scheduled", "archived"];

export default async function SectionsAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: sections }, { data: levels }] = await Promise.all([
    supabase.from("site_sections").select("*").order("position"),
    supabase.from("fan_levels").select("id,name").order("position"),
  ]);
  return (
    <>
      <header className="admin-hero">
        <div><span className="section-kicker">SITE CONTROL</span><h1>Sections Manager</h1><p>Controla visibilidad, estructura, acceso, navegación, SEO y estado de cada sección pública sin borrar historial.</p></div>
      </header>
      <section className="control-room-grid">
        <div className="settings-card control-room-form"><SectionForm levels={levels || []} /></div>
        <div className="settings-card">
          <span>LIVE STRUCTURE</span>
          {(sections || []).map((item) => (
            <article className="cms-control-row" key={item.id}>
              <div><strong>{item.public_name}</strong><small>{item.section_key} · /{item.slug}</small></div>
              <div className="cms-status-stack"><span data-status={item.status}>{item.status}</span><small>#{item.position}</small></div>
              <SectionForm item={item} levels={levels || []} compact />
              {item.status !== "archived" ? <form action={archiveSiteSection}><input type="hidden" name="id" value={item.id} /><button className="compact-danger-button">Archive</button></form> : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionForm({ item, levels, compact = false }: { item?: Record<string, unknown>; levels: { id: number; name: string }[]; compact?: boolean }) {
  return (
    <details className={compact ? "cms-inline-editor" : undefined} open={!compact}>
      <summary>{compact ? "Edit" : "Nueva sección / editar manualmente"}</summary>
      <form action={saveSiteSection} className="control-room-fields">
        <input type="hidden" name="id" value={String(item?.id || "")} />
        <label>Nombre interno<input name="internalName" defaultValue={String(item?.internal_name || "")} required /></label>
        <label>Nombre público<input name="publicName" defaultValue={String(item?.public_name || "")} required /></label>
        <label>Key<input name="sectionKey" defaultValue={String(item?.section_key || "")} required /></label>
        <label>Slug<input name="slug" defaultValue={String(item?.slug || "")} required /></label>
        <label>Status<select name="status" defaultValue={String(item?.status || "draft")}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Universo<select name="project" defaultValue={String(item?.project || "")}><option value="">Ambos</option><option value="iamjoshwa">IAMJOSHWA</option><option value="afterluv">AFTERLUV</option></select></label>
        <label>Orden<input name="position" type="number" defaultValue={String(item?.position || 0)} /></label>
        <label>Ícono<input name="icon" defaultValue={String(item?.icon || "")} /></label>
        <label>Badge<input name="badge" defaultValue={String(item?.badge || "")} /></label>
        <label>CTA<input name="ctaLabel" defaultValue={String(item?.cta_label || "")} /></label>
        <label>CTA URL<input name="ctaHref" defaultValue={String(item?.cta_href || "")} /></label>
        <label>Publish at<input name="publishAt" type="datetime-local" /></label>
        <label>Unpublish at<input name="unpublishAt" type="datetime-local" /></label>
        <label>Nivel mínimo<select name="minPassLevel" defaultValue={String(item?.min_pass_level || "")}><option value="">Sin nivel</option>{levels.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
        <div className="checkbox-grid">
          <label><input name="showInNavbar" type="checkbox" defaultChecked={Boolean(item?.show_in_navbar)} /> Navbar</label>
          <label><input name="showInFooter" type="checkbox" defaultChecked={Boolean(item?.show_in_footer)} /> Footer</label>
          <label><input name="showOnHome" type="checkbox" defaultChecked={Boolean(item?.show_on_home)} /> Home</label>
          <label><input name="showInSitemap" type="checkbox" defaultChecked={item ? Boolean(item.show_in_sitemap) : true} /> Sitemap</label>
          <label><input name="requiresAuth" type="checkbox" defaultChecked={Boolean(item?.requires_auth)} /> Login</label>
          <label><input name="requiresPass" type="checkbox" defaultChecked={Boolean(item?.requires_pass)} /> Josh Pass</label>
          <label><input name="indexable" type="checkbox" defaultChecked={item ? Boolean(item.indexable) : true} /> Indexable</label>
        </div>
        <label>SEO title<input name="seoTitle" defaultValue={String(item?.seo_title || "")} /></label>
        <label>SEO description<textarea name="seoDescription" rows={3} defaultValue={String(item?.seo_description || "")} /></label>
        <button className="button primary">{item ? "Guardar sección" : "Crear sección"}</button>
      </form>
    </details>
  );
}
