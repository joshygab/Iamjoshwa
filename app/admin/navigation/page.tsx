import { saveNavigationItem } from "../actions";
import { requireRole } from "@/lib/auth/require-role";
import { formatMxInputDateTime } from "@/lib/dates";

const statuses = ["draft", "published", "hidden", "coming_soon", "members_only", "scheduled", "archived"];

export default async function NavigationAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: items }, { data: sections }] = await Promise.all([
    supabase.from("navigation_items").select("*").order("position"),
    supabase.from("site_sections").select("id,public_name").neq("status", "archived").order("position"),
  ]);
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">WEBSITE</span><h1>Navigation Manager</h1><p>Edita navbar y footer sin hardcodear. Cambiar orden aquí actualiza el sitio público cuando se publique.</p></div></header>
      <section className="control-room-grid">
        <div className="settings-card control-room-form"><NavForm sections={sections || []} /></div>
        <div className="settings-card">
          <span>NAV ITEMS</span>
          {(items || []).map((item) => <article className="cms-control-row" key={item.id}><div><strong>≡ {item.label}</strong><small>{item.href} · #{item.position}</small></div><span data-status={item.status || (item.visible ? "published" : "hidden")}>{item.status || (item.visible ? "published" : "hidden")}</span><NavForm item={item} sections={sections || []} compact /></article>)}
        </div>
      </section>
    </>
  );
}

function NavForm({ item, sections, compact = false }: { item?: Record<string, unknown>; sections: { id: string; public_name: string }[]; compact?: boolean }) {
  return (
    <details className={compact ? "cms-inline-editor" : undefined} open={!compact}>
      <summary>{compact ? "Edit" : "Nuevo link"}</summary>
      <form action={saveNavigationItem} className="control-room-fields">
        <input type="hidden" name="id" value={String(item?.id || "")} />
        <label>Label<input name="label" defaultValue={String(item?.label || "")} required /></label>
        <label>URL<input name="href" defaultValue={String(item?.href || "")} required /></label>
        <label>Sección interna<select name="sectionId" defaultValue={String(item?.section_id || "")}><option value="">Sin sección</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.public_name}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={String(item?.status || "published")}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Universo<select name="project" defaultValue={String(item?.project || "")}><option value="">Ambos</option><option value="iamjoshwa">IAMJOSHWA</option><option value="afterluv">AFTERLUV</option></select></label>
        <label>Target<select name="target" defaultValue={String(item?.target || "_self")}><option value="_self">Misma pestaña</option><option value="_blank">Nueva pestaña</option></select></label>
        <label>Orden<input name="position" type="number" defaultValue={String(item?.position || 0)} /></label>
        <label>Icono<input name="icon" defaultValue={String(item?.icon || "")} /></label>
        <label>Badge<input name="badge" defaultValue={String(item?.badge || "")} /></label>
        <label>Publish at<input name="publishAt" type="datetime-local" defaultValue={formatMxInputDateTime(String(item?.publish_at || ""))} /></label>
        <label>Unpublish at<input name="unpublishAt" type="datetime-local" defaultValue={formatMxInputDateTime(String(item?.unpublish_at || ""))} /></label>
        <div className="checkbox-grid">
          <label><input name="visible" type="checkbox" defaultChecked={item ? Boolean(item.visible) : true} /> Visible</label>
          <label><input name="showInNavbar" type="checkbox" defaultChecked={item ? Boolean(item.show_in_navbar) : true} /> Navbar</label>
          <label><input name="showInFooter" type="checkbox" defaultChecked={Boolean(item?.show_in_footer)} /> Footer</label>
          <label><input name="showOnDesktop" type="checkbox" defaultChecked={item ? Boolean(item.show_on_desktop) : true} /> Desktop</label>
          <label><input name="showOnMobile" type="checkbox" defaultChecked={item ? Boolean(item.show_on_mobile) : true} /> Mobile</label>
        </div>
        <button className="button primary">Guardar navegación</button>
      </form>
    </details>
  );
}
