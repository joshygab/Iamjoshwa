import { resetContentLabel, saveContentLabel } from "../actions";
import { requireRole } from "@/lib/auth/require-role";
import { formatMxDateTime } from "@/lib/dates";

export default async function LabelsAdmin() {
  const { supabase } = await requireRole(["editor", "admin"]);
  const [{ data: labels }, { data: revisions }] = await Promise.all([
    supabase.from("content_labels").select("*").order("group_key").order("label_key"),
    supabase.from("content_revisions").select("field_key,previous_value,new_value,created_at").eq("entity_type", "content_labels").order("created_at", { ascending: false }).limit(20),
  ]);
  const groups = new Map<string, typeof labels>();
  for (const label of labels || []) groups.set(label.group_key, [...(groups.get(label.group_key) || []), label]);
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">TEXT MANAGER</span><h1>Content & Labels</h1><p>Edita textos editoriales, CTAs, empty states y labels con default + reset. Sin editar JSON ni código.</p></div></header>
      <section className="control-room-grid">
        <div className="settings-card control-room-form"><LabelForm /></div>
        <div className="settings-card labels-control-list">
          {[...groups.entries()].map(([group, items]) => <section key={group}><h2>{group.toUpperCase()}</h2>{(items || []).map((item) => <article key={item.id} className="cms-label-row"><LabelForm item={item} /><form action={resetContentLabel}><input type="hidden" name="id" value={item.id} /><button className="compact-secondary-button">Reset to default</button></form></article>)}</section>)}
        </div>
      </section>
      <section className="settings-card revision-feed"><span>VERSION HISTORY</span>{(revisions || []).map((revision) => <p key={`${revision.field_key}-${revision.created_at}`}><strong>{revision.field_key}</strong> · {formatMxDateTime(revision.created_at)} MX</p>)}</section>
    </>
  );
}

function LabelForm({ item }: { item?: Record<string, unknown> }) {
  return (
    <details open={!item} className={item ? "cms-inline-editor" : undefined}>
      <summary>{item ? String(item.label_key) : "Nuevo texto editable"}</summary>
      <form action={saveContentLabel} className="control-room-fields">
        <input type="hidden" name="id" value={String(item?.id || "")} />
        <label>Key<input name="labelKey" defaultValue={String(item?.label_key || "")} required /></label>
        <label>Grupo<input name="groupKey" defaultValue={String(item?.group_key || "global")} required /></label>
        <label>Current value<textarea name="currentValue" rows={3} defaultValue={String(item?.current_value || "")} /></label>
        <label>Default value<textarea name="defaultValue" rows={3} defaultValue={String(item?.default_value || "")} required /></label>
        <label>Descripción<input name="description" defaultValue={String(item?.description || "")} /></label>
        <label>Status<select name="status" defaultValue={String(item?.status || "published")}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select></label>
        <button className="button primary">Guardar texto</button>
      </form>
    </details>
  );
}
