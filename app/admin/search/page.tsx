import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase } = await requireRole(["editor", "admin"]);
  const query = q.trim();
  const [sections, labels, nav, announcements] = query ? await Promise.all([
    supabase.from("site_sections").select("id,public_name,section_key,status").ilike("public_name", `%${query}%`).limit(20),
    supabase.from("content_labels").select("id,label_key,group_key,current_value,default_value").or(`label_key.ilike.%${query}%,default_value.ilike.%${query}%,current_value.ilike.%${query}%`).limit(20),
    supabase.from("navigation_items").select("id,label,href").ilike("label", `%${query}%`).limit(20),
    supabase.from("announcements").select("id,title,status").ilike("title", `%${query}%`).limit(20),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">GLOBAL ADMIN SEARCH</span><h1>Buscar en el CMS</h1><p>Encuentra secciones, labels, navegación y announcements desde un solo lugar.</p></div></header>
      <form className="settings-card admin-search-form"><label>Buscar<input name="q" defaultValue={query} placeholder="Vault, Book, Pass..." /></label><button className="button primary">Buscar</button></form>
      <section className="settings-grid">
        <Results title="Sections" href="/admin/sections" rows={(sections.data || []).map((item) => `${item.public_name} · ${item.section_key} · ${item.status}`)} />
        <Results title="Labels" href="/admin/labels" rows={(labels.data || []).map((item) => `${item.label_key} · ${item.current_value || item.default_value}`)} />
        <Results title="Navigation" href="/admin/navigation" rows={(nav.data || []).map((item) => `${item.label} · ${item.href}`)} />
        <Results title="Announcements" href="/admin/announcements" rows={(announcements.data || []).map((item) => `${item.title} · ${item.status}`)} />
      </section>
    </>
  );
}

function Results({ title, href, rows }: { title: string; href: string; rows: string[] }) {
  return <article className="settings-card"><span>{title}</span>{rows.length ? rows.map((row) => <p key={row}>{row}</p>) : <p className="form-note">Sin resultados.</p>}<Link className="text-link" href={href}>Abrir módulo</Link></article>;
}
