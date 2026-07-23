"use client";

import { useMemo, useState } from "react";

export type MediaAsset = {
  id: string;
  display_name: string;
  title: string | null;
  description: string | null;
  alt_text: string | null;
  tags: string[] | null;
  mime_type: string;
  byte_size: number;
  public_url: string;
  archived_at: string | null;
  width: number | null;
  height: number | null;
  focal_x: number | null;
  focal_y: number | null;
  in_gallery?: boolean;
};

export function MediaLibrary({ assets, isAdmin, onChange }: { assets: MediaAsset[]; isAdmin: boolean; onChange: React.Dispatch<React.SetStateAction<MediaAsset[]>> }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("image");
  const [editing, setEditing] = useState<MediaAsset | null>(null);

  const filtered = useMemo(
    () =>
      assets.filter((item) => {
        const matchesType = type === "all" || item.mime_type.startsWith(`${type}/`);
        const searchable = `${item.display_name} ${item.title || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        return matchesType && searchable.includes(query.toLowerCase());
      }),
    [assets, query, type],
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/media/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        display_name: form.get("displayName"),
        title: form.get("title") || null,
        description: form.get("description") || null,
        alt_text: form.get("alt") || null,
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        focal_x: Number(form.get("focalX") || 0.5),
        focal_y: Number(form.get("focalY") || 0.5),
        archived: false,
      }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error);
    onChange((current) => current.map((item) => (item.id === editing.id ? { ...item, ...data.asset, public_url: item.public_url } : item)));
    setEditing(null);
  }

  async function publish(asset: MediaAsset) {
    const response = await fetch(`/api/admin/media/${asset.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: null,
        title: asset.title || asset.display_name,
        caption: asset.description || "",
        featured: false,
      }),
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error);
    onChange((current) => current.map((item) => (item.id === asset.id ? { ...item, in_gallery: true } : item)));
    setEditing((current) => (current?.id === asset.id ? { ...current, in_gallery: true } : current));
  }

  async function archive(asset: MediaAsset) {
    const response = await fetch(`/api/admin/media/${asset.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: asset.display_name, archived: true }),
    });
    if (response.ok) onChange((current) => current.filter((item) => item.id !== asset.id));
  }

  async function remove(asset: MediaAsset) {
    if (!confirm(`¿Eliminar permanentemente ${asset.display_name}?`)) return;
    const response = await fetch(`/api/admin/media/${asset.id}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) onChange((current) => current.filter((item) => item.id !== asset.id));
    else alert(data.error);
  }

  return (
    <>
      <div className="media-toolbar">
        <input aria-label="Buscar archivos" placeholder="Buscar por nombre, título o etiqueta" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="image">Imágenes</option>
          <option value="all">Todos</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="application">Documentos</option>
        </select>
      </div>

      <section className="media-grid professional-media-grid">
        {filtered.length ? filtered.map((asset) => (
          <article key={asset.id}>
            {asset.mime_type.startsWith("image/") ? (
              <button
                className="media-preview media-thumb-button"
                onClick={() => setEditing(asset)}
                aria-label={`Editar ${asset.display_name}`}
                style={{ backgroundImage: `url(${asset.public_url})`, backgroundPosition: `${(asset.focal_x ?? 0.5) * 100}% ${(asset.focal_y ?? 0.5) * 100}%` }}
              />
            ) : (
              <div className="media-placeholder">{asset.mime_type.split("/")[0].toUpperCase()}</div>
            )}
            <div className="media-card-title">
              <strong>{asset.display_name}</strong>
              <span>{asset.in_gallery ? "En galería" : "Solo biblioteca"}</span>
            </div>
            <small>{Math.round(asset.byte_size / 1024)} KB · {asset.width && asset.height ? `${asset.width}x${asset.height}` : asset.mime_type}</small>
            <div className="media-actions">
              <button onClick={() => setEditing(asset)}>Editar</button>
              {asset.mime_type.startsWith("image/") && <button onClick={() => publish(asset)} disabled={asset.in_gallery}>{asset.in_gallery ? "Publicado" : "Mostrar en galería"}</button>}
              <button onClick={() => navigator.clipboard.writeText(asset.public_url)}>Copiar URL</button>
              <button onClick={() => archive(asset)}>Archivar</button>
              {isAdmin && <button className="danger" onClick={() => remove(asset)}>Eliminar</button>}
            </div>
          </article>
        )) : (
          <div className="admin-empty">
            <h2>Sin resultados.</h2>
            <p>Ajusta la búsqueda o sube archivos.</p>
          </div>
        )}
      </section>

      {editing && (
        <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label="Editar archivo">
          <form className="settings-card media-modal" onSubmit={save}>
            <button type="button" className="drawer-close" onClick={() => setEditing(null)}>Cerrar</button>
            <h2>Editar imagen</h2>
            <p className="form-note">Ajusta nombre, texto alternativo y punto focal. El punto focal mejora el recorte en hero, flyers y cards.</p>
            <div className="media-preview large" style={{ backgroundImage: `url(${editing.public_url})`, backgroundPosition: `${(editing.focal_x ?? 0.5) * 100}% ${(editing.focal_y ?? 0.5) * 100}%` }} />
            <label>Nombre visible<input name="displayName" defaultValue={editing.display_name} required /></label>
            <label>Título<input name="title" defaultValue={editing.title || ""} /></label>
            <label>Descripción<textarea name="description" rows={3} defaultValue={editing.description || ""} /></label>
            <label>Texto alternativo<input name="alt" defaultValue={editing.alt_text || ""} /></label>
            <label>Etiquetas<input name="tags" defaultValue={(editing.tags || []).join(", ")} /></label>
            {editing.mime_type.startsWith("image/") && (
              <>
                <label>Punto focal horizontal<input name="focalX" type="range" min="0" max="1" step="0.01" defaultValue={editing.focal_x ?? 0.5} /></label>
                <label>Punto focal vertical<input name="focalY" type="range" min="0" max="1" step="0.01" defaultValue={editing.focal_y ?? 0.5} /></label>
              </>
            )}
            <div className="inline-actions">
              <button className="button primary">Guardar</button>
              <button type="button" className="button secondary" onClick={() => publish(editing)} disabled={editing.in_gallery}>{editing.in_gallery ? "Ya está en galería" : "Mostrar en galería"}</button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
