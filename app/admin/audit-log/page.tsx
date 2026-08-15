import { requireRole } from "@/lib/auth/require-role";
import { formatMxDateTime } from "@/lib/dates";

export default async function AuditLogPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,created_at,old_values,new_values").order("created_at", { ascending: false }).limit(120);
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">AUDIT LOG</span><h1>Historial administrativo</h1><p>Cambios importantes: publicaciones, archivos, roles, labels, secciones, media y settings.</p></div></header>
      <section className="admin-table audit-log-table">
        <div className="admin-table-head"><span>ACCIÓN</span><span>{data?.length || 0} registros</span></div>
        {(data || []).map((row) => <article key={row.id}><div><strong>{row.action} · {row.entity_type}</strong><small>{formatMxDateTime(row.created_at)} MX · {row.entity_id}</small></div><details><summary>Ver valores</summary><pre>{JSON.stringify({ old: row.old_values, new: row.new_values }, null, 2)}</pre></details></article>)}
      </section>
    </>
  );
}
