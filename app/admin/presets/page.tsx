import { saveAppPreset } from "../actions";
import { requireRole } from "@/lib/auth/require-role";

export default async function PresetsAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("app_presets").select("*").order("name");
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">APP MODES</span><h1>Presets</h1><p>Guarda modos como SHOW MODE, RELEASE MODE o AFTERLUV ACTIVE sin destruir configuración existente.</p></div></header>
      <section className="control-room-grid">
        <div className="settings-card control-room-form"><PresetForm /></div>
        <div className="settings-card">{(data || []).map((item) => <article className="cms-control-row" key={item.id}><div><strong>{item.name}</strong><small>{item.preset_key} · {item.active ? "ACTIVE" : "inactive"}</small></div><PresetForm item={item} compact /></article>)}</div>
      </section>
    </>
  );
}

function PresetForm({ item, compact = false }: { item?: Record<string, unknown>; compact?: boolean }) {
  return (
    <details className={compact ? "cms-inline-editor" : undefined} open={!compact}>
      <summary>{compact ? "Edit" : "Nuevo preset"}</summary>
      <form action={saveAppPreset} className="control-room-fields">
        <input type="hidden" name="id" value={String(item?.id || "")} />
        <label>Key<input name="presetKey" defaultValue={String(item?.preset_key || "")} required /></label>
        <label>Name<input name="name" defaultValue={String(item?.name || "")} required /></label>
        <label>Description<textarea name="description" rows={3} defaultValue={String(item?.description || "")} /></label>
        <label>Config JSON<textarea name="config" rows={8} defaultValue={JSON.stringify(item?.config || { mode: "standard" }, null, 2)} /></label>
        <label className="checkbox"><input name="active" type="checkbox" defaultChecked={Boolean(item?.active)} /> Active</label>
        <button className="button primary">Guardar preset</button>
      </form>
    </details>
  );
}
