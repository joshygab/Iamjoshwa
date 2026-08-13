"use client";

import { useMemo, useState } from "react";

export type MediaAsset = {
  id: string;
  bucket?: string;
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
  usage_count?: number;
  usage_labels?: string[];
};

export function MediaLibrary({ assets, isAdmin, onChange }: { assets: MediaAsset[]; isAdmin: boolean; onChange: React.Dispatch<React.SetStateAction<MediaAsset[]>> }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("image");
  const [usageFilter, setUsageFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const activeAssets = assets.filter((item) => !item.archived_at);
  const archivedAssets = assets.filter((item) => item.archived_at);
  const unusedAssets = activeAssets.filter((item) => !item.in_gallery && !item.usage_count);
  const totalSizeMb = assets.reduce((sum, item) => sum + Number(item.byte_size || 0), 0) / 1024 / 1024;

  const filtered = useMemo(
    () =>
      assets.filter((item) => {
        const matchesType = type === "all" || item.mime_type.startsWith(`${type}/`);
        const matchesArchive = showArchived ? Boolean(item.archived_at) : !item.archived_at;
        const matchesUsage = usageFilter === "all" || (usageFilter === "used" ? Boolean(item.usage_count || item.in_gallery) : !item.usage_count && !item.in_gallery);
        const searchable = `${item.display_name} ${item.title || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        return matchesType && matchesArchive && matchesUsage && searchable.includes(query.toLowerCase());
      }),
    [assets, query, type, showArchived, usageFilter],
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
    const data = await response.json();
    if (response.ok) onChange((current) => current.map((item) => (item.id === asset.id ? { ...item, ...data.asset, public_url: item.public_url } : item)));
  }

  async function restore(asset: MediaAsset) {
    const response = await fetch(`/api/admin/media/${asset.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: asset.display_name, archived: false }),
    });
    const data = await response.json();
    if (response.ok) onChange((current) => current.map((item) => (item.id === asset.id ? { ...item, ...data.asset, public_url: item.public_url } : item)));
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
      <section className="media-intelligence-board">
        <article>
          <span>ACTIVOS</span>
          <strong>{activeAssets.length}</strong>
          <p>Archivos disponibles para publicar.</p>
        </article>
        <article>
          <span>SIN USO DETECTADO</span>
          <strong>{unusedAssets.length}</strong>
          <p>Candidatos para archivar si ya no los necesitas.</p>
        </article>
        <article>
          <span>ARCHIVADOS</span>
          <strong>{archivedAssets.length}</strong>
          <p>Ocultos de la biblioteca activa.</p>
        </article>
        <article>
          <span>TAMAÑO TOTAL</span>
          <strong>{totalSizeMb.toFixed(1)} MB</strong>
          <p>Referencial; no borres archivos en uso.</p>
        </article>
      </section>

      {unusedAssets.length ? (
        <section className="media-cleanup-panel">
          <div>
            <span className="section-kicker">LIMPIEZA SEGURA</span>
            <h2>{unusedAssets.length} archivos parecen no estar conectados.</h2>
            <p>Primero archiva. Eliminar permanente solo está disponible para admins y el servidor vuelve a validar referencias.</p>
          </div>
          <div>
            {unusedAssets.slice(0, 5).map((asset) => (
              <button key={asset.id} onClick={() => archive(asset)}>
                <span>{asset.display_name}</span>
                <small>Archivar</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="media-toolbar">
        <input aria-label="Buscar archivos" placeholder="Buscar por nombre, título o etiqueta" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="image">Imágenes</option>
          <option value="all">Todos</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="application">Documentos</option>
        </select>
        <select aria-label="Filtrar por uso" value={usageFilter} onChange={(event) => setUsageFilter(event.target.value)}>
          <option value="all">Uso: todos</option>
          <option value="used">En uso</option>
          <option value="unused">Sin uso detectado</option>
        </select>
        <button className="button secondary" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Ver activos" : "Ver archivados"}</button>
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
              <span>{asset.archived_at ? "Archivado" : asset.usage_count ? `${asset.usage_count} usos` : asset.in_gallery ? "En galería" : "Sin uso detectado"}</span>
            </div>
            <small>{Math.round(asset.byte_size / 1024)} KB · {asset.width && asset.height ? `${asset.width}x${asset.height}` : asset.mime_type}</small>
            {asset.usage_labels?.length ? (
              <div className="media-usage-list">
                {asset.usage_labels.slice(0, 3).map((label) => <span key={label}>{label}</span>)}
              </div>
            ) : (
              <p className="media-unused-note">No aparece conectado a contenido publicado o configuración.</p>
            )}
            <div className="media-actions">
              <button onClick={() => setEditing(asset)}>Editar</button>
              {asset.mime_type.startsWith("image/") && !asset.archived_at && <button onClick={() => publish(asset)} disabled={asset.in_gallery}>{asset.in_gallery ? "Publicado" : "Mostrar en galería"}</button>}
              <button onClick={() => navigator.clipboard.writeText(asset.public_url)}>Copiar URL</button>
              {asset.archived_at ? <button onClick={() => restore(asset)}>Restaurar</button> : <button onClick={() => archive(asset)}>Archivar</button>}
              {isAdmin && <button className="danger" onClick={() => remove(asset)} disabled={Boolean(asset.usage_count || asset.in_gallery)}>{asset.usage_count || asset.in_gallery ? "En uso" : "Eliminar"}</button>}
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
            <div className="media-usage-panel">
              <span>Uso detectado</span>
              {editing.usage_labels?.length ? editing.usage_labels.map((label) => <p key={label}>{label}</p>) : <p>Sin referencias detectadas. Puedes archivarlo si ya no lo necesitas.</p>}
            </div>
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
              <button type="button" className="button secondary" onClick={() => publish(editing)} disabled={editing.in_gallery || Boolean(editing.archived_at)}>{editing.archived_at ? "Restaura para publicar" : editing.in_gallery ? "Ya está en galería" : "Mostrar en galería"}</button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
