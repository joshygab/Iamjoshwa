"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteContentButton } from "./delete-content-button";
import { formatMxInputDateTime } from "@/lib/dates";

type EditorValues = Record<string, unknown> & { id?: string };
type Asset = { id: string; display_name: string; mime_type: string; byte_size?: number | null; public_url?: string };
type ReleaseLink = { platform: string; url: string; position: number };
type ReleaseCredit = { role: string; name: string };
type SetTrack = { position: number; timestamp_seconds?: number; artist?: string; title: string; is_unreleased?: boolean };
type Props = { module: string; initial?: EditorValues; assets?: Asset[] };

export function ContentEditor({ module, initial = {}, assets = [] }: Props) {
  const router = useRouter();
  const [state, setState] = useState<{ loading?: boolean; error?: string; success?: string; fields?: Record<string, string[]> }>({});
  const [previewValues, setPreviewValues] = useState<Record<string, FormDataEntryValue>>(() => initialSnapshot(module, initial));
  const publishIssue = useMemo(() => getClientPublishIssue(module, previewValues), [module, previewValues]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true });
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.slug) {
      const source = String(values.name || values.title || "");
      if (source) values.slug = slugify(source);
    }
    const issue = getClientPublishIssue(module, values);
    if (issue) return setState({ error: issue });
    const response = await fetch("/api/admin/content", {
      method: initial.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ module, id: initial.id, values }),
    });
    const data = await response.json();
    if (!response.ok) return setState({ error: data.error || "No fue posible guardar.", fields: data.fields });
    const status = String(values.publication_status || values.status || "draft");
    setState({ success: status === "published" ? "Publicado correctamente." : "Guardado." });
    window.setTimeout(() => {
      router.push(initial.id ? `/admin/${module}` : `/admin/${module}/${data.id}`);
      router.refresh();
    }, 650);
  }

  async function archive() {
    if (!initial.id || !confirm("¿Archivar este contenido?")) return;
    const response = await fetch("/api/admin/content", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ module, id: initial.id }),
    });
    if (response.ok) {
      router.push(`/admin/${module}`);
      router.refresh();
    } else {
      setState({ error: (await response.json()).error });
    }
  }

  const common = (
    <>
      <label>
        Proyecto
        <select name="project" defaultValue={text(initial.project, "iamjoshwa")}>
          <option value="iamjoshwa">IAMJOSHWA</option>
          <option value="afterluv">AFTERLUV</option>
        </select>
      </label>
      <label>
        Estado
        <select name="publication_status" defaultValue={text(initial.publication_status, "draft")}>
          <option value="draft">Borrador</option>
          <option value="scheduled">Programado</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </select>
      </label>
      <label>
        Programar publicación
        <input name="publish_at" type="datetime-local" defaultValue={dateTime(initial.publish_at)} />
      </label>
    </>
  );

  return (
    <form className="content-editor" onSubmit={submit} onInput={(event) => setPreviewValues(Object.fromEntries(new FormData(event.currentTarget)))} onChange={(event) => setPreviewValues(Object.fromEntries(new FormData(event.currentTarget)))}>
      <PublishingPreview module={module} values={previewValues} issue={publishIssue} />
      {module === "eventos" && (
        <>
          {common}
          <Text name="name" label="Nombre" value={initial.name} required />
          <Text name="slug" label="Slug" value={initial.slug} pattern="[a-z0-9-]+" />
          <MediaSelect name="flyer_asset_id" label="Flyer" value={initial.flyer_asset_id} assets={assets} />
          <DateTime name="starts_at" label="Inicio" value={initial.starts_at} required />
          <DateTime name="doors_at" label="Apertura" value={initial.doors_at} />
          <DateTime name="set_starts_at" label="Horario del set" value={initial.set_starts_at} />
          <Text name="venue" label="Venue" value={initial.venue} />
          <Text name="address" label="Dirección" value={initial.address} />
          <Text name="city" label="Ciudad" value={initial.city} required />
          <Text name="country" label="País" value={initial.country || "México"} required />
          <NumberField name="latitude" label="Latitud" value={initial.latitude} min="-90" max="90" />
          <NumberField name="longitude" label="Longitud" value={initial.longitude} min="-180" max="180" />
          <Text name="lineup" label="Lineup, separado por comas" value={array(initial.lineup)} />
          <Text name="genres" label="Géneros, separados por comas" value={array(initial.genres)} />
          <Text name="age_restriction" label="Restricción de edad" value={initial.age_restriction} />
          <NumberField name="price_amount" label="Precio" value={initial.price_amount} min="0" />
          <Text name="currency" label="Moneda ISO" value={initial.currency || "MXN"} />
          <Text name="ticket_url" label="Enlace de boletos" value={initial.ticket_url} type="url" />
          <Text name="promo_code" label="Código promocional" value={initial.promo_code} />
          <label>
            Estado del evento
            <select name="event_status" defaultValue={text(initial.event_status, "upcoming")}>
              {[
                ["upcoming", "Próximamente"],
                ["registration_open", "Registro abierto"],
                ["presale", "Preventa"],
                ["last_tickets", "Últimos boletos"],
                ["sold_out", "Sold out"],
                ["waitlist", "Lista de espera"],
                ["cancelled", "Cancelado"],
                ["rescheduled", "Reprogramado"],
                ["completed", "Finalizado"],
              ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={Boolean(initial.featured)} /> Destacado</label>
          <Area name="description" label="Descripción" value={initial.description} />
          <Area name="faq" label="Preguntas frecuentes (JSON)" value={json(initial.faq, [])} />
        </>
      )}

      {module === "lanzamientos" && (
        <>
          {common}
          <Text name="name" label="Nombre" value={initial.name} required />
          <Text name="slug" label="Slug" value={initial.slug} pattern="[a-z0-9-]+" />
          <MediaSelect name="cover_asset_id" label="Portada" value={initial.cover_asset_id} assets={assets} />
          <MediaSelect name="preview_asset_id" label="Fragmento de audio" value={initial.preview_asset_id} assets={assets} kind="audio" />
          <Text name="release_type" label="Tipo" value={initial.release_type || "Single"} required />
          <DateTime name="releases_at" label="Estreno" value={initial.releases_at} required />
          <Text name="presave_url" label="Pre-save" value={initial.presave_url} type="url" />
          <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={Boolean(initial.featured)} /> Destacado</label>
          <Area name="story" label="Historia" value={initial.story} />
          <CreditsEditor value={initial.credits} />
          <ReleaseLinksEditor value={initial.release_links} />
        </>
      )}

      {module === "sets" && (
        <>
          {common}
          <Text name="title" label="Título" value={initial.title} required />
          <Text name="slug" label="Slug" value={initial.slug} pattern="[a-z0-9-]+" />
          <MediaSelect name="cover_asset_id" label="Portada" value={initial.cover_asset_id} assets={assets} />
          <SetSourceStudio initial={initial} assets={assets} onSourceChange={(values) => setPreviewValues((current) => ({ ...current, ...values }))} />
          <Text name="category" label="Categoría" value={initial.category || "Club"} />
          <Text name="recorded_at" label="Fecha de grabación" value={initial.recorded_at} type="date" />
          <Text name="location" label="Lugar" value={initial.location} />
          <NumberField name="duration_seconds" label="Duración en segundos" value={initial.duration_seconds} min="1" />
          <Text name="genres" label="Géneros, separados por comas" value={array(initial.genres)} />
          <NumberField name="bpm_min" label="BPM mínimo" value={initial.bpm_min} min="40" max="250" />
          <NumberField name="bpm_max" label="BPM máximo" value={initial.bpm_max} min="40" max="250" />
          <NumberField name="energy" label="Energía 1–5" value={initial.energy} min="1" max="5" />
          <div className="content-editor-note wide-field">
            <strong>Audio opcional.</strong>
            <span>Si no subes MP3/WAV, el set puede publicarse usando SoundCloud, YouTube, Mixcloud o un enlace externo oficial.</span>
          </div>
          <label>
            Acceso
            <select name="access_level" defaultValue={text(initial.access_level, "public")}>
              <option value="public">Público</option>
              <option value="exclusive">Exclusivo</option>
            </select>
          </label>
          <label className="checkbox"><input name="featured" type="checkbox" defaultChecked={Boolean(initial.featured)} /> Destacado</label>
          <Area name="description" label="Descripción" value={initial.description} />
          <SetTracksEditor value={initial.set_tracks} />
        </>
      )}

      {module === "historia" && (
        <>
          {common}
          <Text name="title" label="Título del hito" value={initial.title} required />
          <Text name="occurred_at" label="Fecha" value={initial.occurred_at} type="date" />
          <MediaSelect name="asset_id" label="Fotografía" value={initial.asset_id} assets={assets} />
          <NumberField name="position" label="Posición" value={initial.position || 0} min="0" />
          <Area name="body" label="Historia" value={initial.body} />
        </>
      )}

      {module === "epk" && (
        <>
          {common}
          <Text name="section_key" label="Identificador de sección" value={initial.section_key} required pattern="[a-z0-9_]+" />
          <NumberField name="position" label="Posición" value={initial.position || 0} min="0" />
          <Area name="content" label="Contenido estructurado (JSON)" value={json(initial.content, {})} />
        </>
      )}

      {module === "recompensas" && (
        <>
          {common}
          <Text name="name" label="Nombre" value={initial.name} required />
          <Text name="slug" label="Slug" value={initial.slug} pattern="[a-z0-9-]+" />
          <NumberField name="points_cost" label="Costo en puntos" value={initial.points_cost || 0} min="0" required />
          <NumberField name="inventory" label="Inventario" value={initial.inventory} min="0" />
          <DateTime name="expires_at" label="Fecha límite" value={initial.expires_at} />
          <Area name="description" label="Descripción" value={initial.description} />
          <Area name="requirements" label="Requisitos en JSON" value={json(initial.requirements, {})} />
        </>
      )}

      {module === "campanas" && (
        <>
          <Text name="name" label="Nombre" value={initial.name} required />
          <label>
            Canal
            <select name="channel" defaultValue={text(initial.channel, "email")}>
              <option value="email">Email</option>
              <option value="whatsapp" disabled>WhatsApp — requiere proveedor</option>
              <option value="push" disabled>Push — futuro</option>
            </select>
          </label>
          <Text name="trigger_type" label="Disparador" value={initial.trigger_type} />
          <Text name="template_key" label="Plantilla" value={initial.template_key} required />
          <Text name="subject" label="Asunto" value={initial.subject} />
          <Area name="audience_filters" label="Filtros de audiencia en JSON" value={json(initial.audience_filters, {})} />
          <Area name="template_data" label="Datos de plantilla en JSON" value={json(initial.template_data, {})} />
          <label>
            Estado
            <select name="status" defaultValue={text(initial.status, "draft")}>
              <option value="draft">Borrador</option>
              <option value="scheduled">Programada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <DateTime name="scheduled_at" label="Programar" value={initial.scheduled_at} />
        </>
      )}

      {state.error && (
        <div className="error-alert" role="alert">
          {state.error}
          {state.fields && <ul>{Object.entries(state.fields).map(([key, messages]) => <li key={key}>{key}: {messages.join(", ")}</li>)}</ul>}
        </div>
      )}
      {state.success && <div className="success-alert" role="status">{state.success}</div>}
      <div className="editor-actions">
        <button className="button primary" disabled={state.loading}>{state.loading ? "Guardando…" : "Guardar"}</button>
        {initial.id && <button type="button" className="button danger-button" onClick={archive}>Archivar</button>}
        {initial.id && <DeleteContentButton module={module} id={String(initial.id)} title={String(initial.name || initial.title || initial.slug || "contenido")} />}
      </div>
    </form>
  );
}

function Text({ name, label, value, type = "text", required, pattern }: { name: string; label: string; value: unknown; type?: string; required?: boolean; pattern?: string }) {
  return <label>{label}<input name={name} type={type} defaultValue={text(value)} required={required} pattern={pattern} /></label>;
}

function NumberField({ name, label, value, min, max, required }: { name: string; label: string; value: unknown; min?: string; max?: string; required?: boolean }) {
  return <label>{label}<input name={name} type="number" defaultValue={text(value)} min={min} max={max} required={required} /></label>;
}

function DateTime({ name, label, value, required }: { name: string; label: string; value: unknown; required?: boolean }) {
  return <label>{label}<input name={name} type="datetime-local" defaultValue={dateTime(value)} required={required} /></label>;
}

function Area({ name, label, value }: { name: string; label: string; value: unknown }) {
  return <label className="wide-field">{label}<textarea name={name} rows={5} defaultValue={text(value)} /></label>;
}

function PublishingPreview({ module, values, issue }: { module: string; values: Record<string, unknown>; issue: string | null }) {
  if (!["eventos", "lanzamientos", "sets"].includes(module)) return null;
  const status = text(values.publication_status, "draft");
  const project = text(values.project, "iamjoshwa").toUpperCase();
  const slug = text(values.slug || values.name || values.title);
  const path = publicPath(module, slugify(slug));
  const visible = status === "published" && !issue;
  const reason = visible
    ? `Visible en ${project}.`
    : issue || (status === "archived" ? "Está archivado y no aparece en la web." : status === "scheduled" ? "Está programado; aparecerá cuando se ejecute la publicación." : "Está como borrador; todavía no aparece públicamente.");

  return (
    <section className={`publish-preview wide-field ${visible ? "is-ready" : "is-waiting"}`}>
      <div>
        <span>PUBLICACIÓN</span>
        <h2>{visible ? "Este contenido ya puede verse." : "Estado de visibilidad"}</h2>
        <p>{reason}</p>
      </div>
      <div>
        <strong>{project}</strong>
        <small>{path}</small>
      </div>
    </section>
  );
}

function CreditsEditor({ value }: { value: unknown }) {
  const existing = Array.isArray(value) ? value as Partial<ReleaseCredit>[] : [];
  const [credits, setCredits] = useState<ReleaseCredit[]>(
    existing.length ? existing.map((item) => ({ role: String(item.role || ""), name: String(item.name || "") })) : [{ role: "Artist", name: "IAMJOSHWA" }, { role: "Producer", name: "" }],
  );
  const payload = credits.filter((credit) => credit.role.trim() && credit.name.trim()).map((credit) => ({ role: credit.role.trim(), name: credit.name.trim() }));
  function update(index: number, key: "role" | "name", next: string) {
    setCredits((current) => current.map((credit, itemIndex) => itemIndex === index ? { ...credit, [key]: next } : credit));
  }
  return (
    <section className="release-link-editor wide-field">
      <input type="hidden" name="credits" value={JSON.stringify(payload)} />
      <div className="release-link-head">
        <div><span>CRÉDITOS</span><p>Agrega artistas, productores, mezcla, master o visuales sin escribir JSON.</p></div>
        <button type="button" className="button secondary" onClick={() => setCredits((current) => [...current, { role: "", name: "" }])}>Agregar crédito</button>
      </div>
      <div className="release-link-grid">
        {credits.map((credit, index) => (
          <div key={`${credit.role}-${index}`}>
            <input aria-label="Rol" placeholder="Rol" value={credit.role} onChange={(event) => update(index, "role", event.target.value)} />
            <input aria-label="Nombre" placeholder="Nombre" value={credit.name} onChange={(event) => update(index, "name", event.target.value)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ReleaseLinksEditor({ value }: { value: unknown }) {
  const defaults = ["Spotify", "Apple Music", "YouTube", "SoundCloud", "Beatport", "Bandcamp", "Tidal", "Deezer", "Amazon Music", "Traxsource"];
  const existing = Array.isArray(value) ? value as Partial<ReleaseLink>[] : [];
  const map = new Map(existing.map((item) => [String(item.platform || ""), String(item.url || "")]));
  const [links, setLinks] = useState<ReleaseLink[]>(
    defaults.map((platform, position) => ({ platform, url: map.get(platform) || "", position }))
      .concat(existing.filter((item) => item.platform && !defaults.includes(String(item.platform))).map((item, index) => ({ platform: String(item.platform), url: String(item.url || ""), position: defaults.length + index }))),
  );
  const payload = links.filter((link) => link.platform.trim() && link.url.trim()).map((link, position) => ({ platform: link.platform.trim(), url: link.url.trim(), position }));
  function update(index: number, key: "platform" | "url", next: string) {
    setLinks((current) => current.map((link, itemIndex) => itemIndex === index ? { ...link, [key]: next } : link));
  }
  return (
    <section className="release-link-editor release-studio wide-field">
      <input type="hidden" name="release_links" value={JSON.stringify(payload)} />
      <div className="release-link-head">
        <div><span>RELEASE STUDIO</span><p>{payload.length ? `${payload.length} plataforma${payload.length === 1 ? "" : "s"} conectada${payload.length === 1 ? "" : "s"}. Si la fecha ya pasó, la página mostrará “Escuchar ahora”.` : "Agrega pre-save o plataformas oficiales antes de publicar."}</p></div>
        <button type="button" className="button secondary" onClick={() => setLinks((current) => [...current, { platform: "", url: "", position: current.length }])}>Agregar otra</button>
      </div>
      <div className="release-platform-cards">
        {links.map((link, index) => (
          <article className={link.url ? "is-connected" : ""} key={`${link.platform}-${index}`}>
            <div>
              <strong>{link.platform || "Plataforma"}</strong>
              <span>{link.url ? "Conectado" : "Pendiente"}</span>
            </div>
            <input aria-label="Plataforma" placeholder="Plataforma" value={link.platform} onChange={(event) => update(index, "platform", event.target.value)} />
            <input aria-label={`URL de ${link.platform || "plataforma"}`} placeholder="https://..." value={link.url} onChange={(event) => update(index, "url", event.target.value)} />
          </article>
        ))}
      </div>
      <div className="studio-preview-card">
        <span>PREVIEW PÚBLICA</span>
        <strong>{payload.length ? "Escuchar ahora" : "Links pendientes"}</strong>
        <p>{payload.length ? payload.map((item) => item.platform).join(" · ") : "Cuando conectes plataformas, aparecerán como cards visuales en la página del lanzamiento."}</p>
      </div>
    </section>
  );
}

function SetSourceStudio({ initial, assets, onSourceChange }: { initial: EditorValues; assets: Asset[]; onSourceChange: (values: Record<string, string>) => void }) {
  const audioAssets = assets.filter((asset) => asset.mime_type.startsWith("audio/"));
  const [audioId, setAudioId] = useState(text(initial.audio_asset_id));
  const [links, setLinks] = useState<Record<string, string>>({
    soundcloud_url: text(initial.soundcloud_url),
    youtube_url: text(initial.youtube_url),
    mixcloud_url: text(initial.mixcloud_url),
    external_url: text(initial.external_url),
  });
  const [source, setSource] = useState(() => initialSetSource(initial));
  const selected = audioAssets.find((asset) => asset.id === audioId);
  const activeLink = source === "audio" ? "" : links[source] || "";
  const playable = Boolean(audioId || Object.values(links).some(Boolean));
  const embed = activeLink ? previewEmbed(source, activeLink) : "";

  function updateAudio(next: string) {
    setAudioId(next);
    onSourceChange({ audio_asset_id: next, ...links });
  }

  function updateLink(key: string, next: string) {
    const updated = { ...links, [key]: next };
    setLinks(updated);
    onSourceChange({ audio_asset_id: audioId, ...updated });
  }

  return (
    <section className="set-source-studio wide-field">
      <div className="release-link-head">
        <div>
          <span>SET STUDIO</span>
          <p>Elige una fuente. Puedes subir MP3/WAV o usar SoundCloud, YouTube, Mixcloud o un link externo oficial.</p>
        </div>
        <strong className={playable ? "studio-ready" : "studio-missing"}>{playable ? "Este set ya es publicable" : "Falta audio o link"}</strong>
      </div>
      <div className="set-source-options">
        {[
          ["audio", "Subir MP3/WAV"],
          ["soundcloud_url", "SoundCloud"],
          ["youtube_url", "YouTube"],
          ["mixcloud_url", "Mixcloud"],
          ["external_url", "Link externo"],
        ].map(([key, label]) => (
          <button className={source === key ? "is-active" : ""} type="button" key={key} onClick={() => setSource(key)}>
            <strong>{label}</strong>
            <span>{key === "audio" ? selected?.display_name || "Sin archivo" : links[key] ? "Link listo" : "Pendiente"}</span>
          </button>
        ))}
      </div>
      {source === "audio" ? (
        <label className="audio-asset-select">
          <span>Archivo de audio del set</span>
          <select name="audio_asset_id" value={audioId} onChange={(event) => updateAudio(event.target.value)}>
            <option value="">Sin asignar</option>
            {audioAssets.map((asset) => <option value={asset.id} key={asset.id}>{asset.display_name}</option>)}
          </select>
        </label>
      ) : (
        <input type="hidden" name="audio_asset_id" value={audioId} />
      )}
      {(["soundcloud_url", "youtube_url", "mixcloud_url", "external_url"] as const).map((key) => (
        source === key ? (
          <label key={key}>
            {sourceLabel(key)}
            <input name={key} type="url" value={links[key]} placeholder="https://..." onChange={(event) => updateLink(key, event.target.value)} />
          </label>
        ) : (
          <input key={key} type="hidden" name={key} value={links[key]} />
        )
      ))}
      <div className="studio-preview-card set-player-preview">
        <span>PREVIEW DEL PLAYER</span>
        {source === "audio" && selected?.public_url ? (
          <>
            <strong>{selected.display_name}</strong>
            <audio controls preload="metadata" src={selected.public_url} />
          </>
        ) : embed ? (
          <iframe title="Preview del set" src={embed} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
        ) : activeLink ? (
          <>
            <strong>Link externo listo</strong>
            <p>Al no existir embed oficial, el botón público abrirá la plataforma.</p>
          </>
        ) : (
          <>
            <strong>Sin fuente todavía</strong>
            <p>Selecciona archivo o pega un link para ver la experiencia antes de guardar.</p>
          </>
        )}
      </div>
    </section>
  );
}

function SetTracksEditor({ value }: { value: unknown }) {
  const existing = Array.isArray(value) ? value as Partial<SetTrack>[] : [];
  const [tracks, setTracks] = useState<Array<{ time: string; artist: string; title: string; is_unreleased: boolean }>>(
    existing.length
      ? existing.map((item) => ({
        time: secondsToTimestamp(typeof item.timestamp_seconds === "number" ? item.timestamp_seconds : undefined),
        artist: String(item.artist || ""),
        title: String(item.title || ""),
        is_unreleased: Boolean(item.is_unreleased),
      }))
      : [{ time: "", artist: "", title: "", is_unreleased: false }],
  );
  const payload = tracks
    .map((track, index) => ({
      position: index + 1,
      timestamp_seconds: timestampToSeconds(track.time),
      artist: track.artist.trim() || undefined,
      title: track.title.trim(),
      is_unreleased: track.is_unreleased,
    }))
    .filter((track) => track.title)
    .map((track) => track.timestamp_seconds == null ? omit(track, "timestamp_seconds") : track);

  function update(index: number, key: "time" | "artist" | "title" | "is_unreleased", next: string | boolean) {
    setTracks((current) => current.map((track, itemIndex) => itemIndex === index ? { ...track, [key]: next } : track));
  }

  function remove(index: number) {
    setTracks((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="release-link-editor set-track-editor wide-field">
      <input type="hidden" name="set_tracks" value={JSON.stringify(payload)} />
      <div className="release-link-head">
        <div><span>TRACKLIST</span><p>Agrega tracks sin escribir JSON. Si no tienes tracklist todavía, deja vacío y guarda normal.</p></div>
        <button type="button" className="button secondary" onClick={() => setTracks((current) => [...current, { time: "", artist: "", title: "", is_unreleased: false }])}>Agregar track</button>
      </div>
      <div className="release-link-grid set-track-grid">
        {tracks.map((track, index) => (
          <div key={`${index}-${track.title}`}>
            <input aria-label="Tiempo" placeholder="00:00" value={track.time} onChange={(event) => update(index, "time", event.target.value)} />
            <input aria-label="Artista" placeholder="Artista opcional" value={track.artist} onChange={(event) => update(index, "artist", event.target.value)} />
            <input aria-label="Título del track" placeholder="Título del track" value={track.title} onChange={(event) => update(index, "title", event.target.value)} />
            <label className="mini-checkbox">
              <input type="checkbox" checked={track.is_unreleased} onChange={(event) => update(index, "is_unreleased", event.target.checked)} />
              Inédito
            </label>
            {tracks.length > 1 ? <button type="button" className="button secondary" onClick={() => remove(index)}>Quitar</button> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function MediaSelect({ name, label, value, assets, kind = "image" }: { name: string; label: string; value: unknown; assets: Asset[]; kind?: "image" | "audio" }) {
  const options = assets.filter((asset) => asset.mime_type.startsWith(`${kind}/`));
  const [selectedId, setSelectedId] = useState(text(value));
  const [query, setQuery] = useState("");
  const selected = options.find((asset) => asset.id === selectedId);
  const visibleOptions = options.filter((asset) => asset.display_name.toLowerCase().includes(query.toLowerCase())).slice(0, 24);
  if (kind === "image") {
    return (
      <section className="media-picker-field wide-field">
        <input type="hidden" name={name} value={selectedId} />
        <div className="media-picker-head">
          <div>
            <span>{label}</span>
            <strong>{selected ? selected.display_name : "Sin imagen asignada"}</strong>
          </div>
          {selectedId ? <button type="button" className="compact-secondary-button" onClick={() => setSelectedId("")}>Quitar</button> : null}
        </div>
        <div className="media-picker-preview">
          {selected?.public_url ? (
            <Image src={selected.public_url} alt={selected.display_name} width={900} height={1125} sizes="(max-width: 760px) 100vw, 760px" />
          ) : (
            <div>
              <strong>Elige un flyer de tu biblioteca</strong>
              <small>{options.length ? "Selecciona una miniatura de abajo." : "Primero sube una imagen en Media Studio."}</small>
            </div>
          )}
        </div>
        <div className="media-picker-toolbar">
          <input aria-label={`Buscar ${label}`} placeholder="Buscar imagen..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <small>{options.length} imágenes disponibles</small>
        </div>
        {visibleOptions.length ? (
          <div className="media-picker-grid">
            {visibleOptions.map((asset) => (
              <button
                aria-pressed={asset.id === selectedId}
                className={asset.id === selectedId ? "is-selected" : ""}
                key={asset.id}
                onClick={() => setSelectedId(asset.id)}
                type="button"
              >
                {asset.public_url ? <Image src={asset.public_url} alt="" width={240} height={300} sizes="118px" /> : null}
                <span>{asset.display_name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="media-picker-empty">{query ? "No encontré imágenes con ese nombre." : "No hay imágenes activas para asignar."}</p>
        )}
      </section>
    );
  }
  return (
    <label className={kind === "audio" ? "audio-asset-select" : undefined}>
      <span>{label}</span>
      <select name={name} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
        <option value="">Sin asignar</option>
        {options.map((asset) => <option value={asset.id} key={asset.id}>{asset.display_name}</option>)}
      </select>
      {kind === "audio" ? (
        <div className="audio-asset-preview">
          {selected?.public_url ? (
            <>
              <div>
                <strong>{selected.display_name}</strong>
                <small>{selected.mime_type === "audio/wav" || selected.mime_type === "audio/x-wav" || selected.mime_type === "audio/wave" ? "WAV" : "MP3"} · {formatBytes(selected.byte_size || 0)}</small>
              </div>
              <audio controls preload="metadata" src={selected.public_url} />
            </>
          ) : (
            <small>{options.length ? "Elige un archivo para previsualizarlo aquí." : "Primero sube un MP3/WAV en Media Studio."}</small>
          )}
        </div>
      ) : null}
    </label>
  );
}

function text(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

function dateTime(value: unknown) {
  return formatMxInputDateTime(value == null ? null : String(value));
}

function array(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : text(value);
}

function json(value: unknown, fallback: unknown) {
  if (value == null) return JSON.stringify(fallback, null, 2);
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "contenido";
}

function formatBytes(value: number) {
  if (!value) return "tamaño pendiente";
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function timestampToSeconds(value: string) {
  const clean = value.trim();
  if (!clean) return undefined;
  const parts = clean.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return undefined;
}

function secondsToTimestamp(value: number | undefined) {
  if (value == null) return "";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);
  return hours ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}` : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function omit<T extends Record<string, unknown>, K extends keyof T>(value: T, key: K) {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function initialSnapshot(module: string, initial: EditorValues): Record<string, FormDataEntryValue> {
  const base: Record<string, FormDataEntryValue> = {
    project: text(initial.project, "iamjoshwa"),
    publication_status: text(initial.publication_status, "draft"),
    slug: text(initial.slug || initial.name || initial.title),
  };
  if (module === "sets") {
    base.audio_asset_id = text(initial.audio_asset_id);
    base.soundcloud_url = text(initial.soundcloud_url);
    base.youtube_url = text(initial.youtube_url);
    base.mixcloud_url = text(initial.mixcloud_url);
    base.external_url = text(initial.external_url);
  }
  if (module === "lanzamientos") {
    base.presave_url = text(initial.presave_url);
    base.releases_at = text(initial.releases_at);
    base.release_links = json(initial.release_links, []);
  }
  return base;
}

function getClientPublishIssue(module: string, values: Record<string, unknown>) {
  const status = text(values.publication_status || values.status, "draft");
  if (!["published", "scheduled"].includes(status)) return null;
  if (module === "sets" && !values.audio_asset_id && !values.soundcloud_url && !values.youtube_url && !values.mixcloud_url && !values.external_url) {
    return "Este set no tiene link ni audio. Sube un MP3/WAV o pega SoundCloud, YouTube, Mixcloud o un link externo antes de publicar.";
  }
  if (module === "lanzamientos") {
    const links = parseLinks(values.release_links).filter((link) => link.url);
    const releaseTime = values.releases_at ? new Date(String(values.releases_at)).getTime() : Number.NaN;
    if (Number.isFinite(releaseTime) && releaseTime <= Date.now() && !links.length) {
      return "Este lanzamiento ya tiene fecha pasada. Agrega links de plataformas para que pueda publicarse como “Escuchar ahora”.";
    }
    if (!values.presave_url && !links.length) return "Agrega un link de pre-save o al menos una plataforma antes de publicar este lanzamiento.";
  }
  return null;
}

function parseLinks(value: unknown): ReleaseLink[] {
  if (Array.isArray(value)) return value as ReleaseLink[];
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as ReleaseLink[] : [];
  } catch {
    return [];
  }
}

function publicPath(module: string, slug: string) {
  if (module === "eventos") return `/fechas/${slug}`;
  if (module === "lanzamientos") return `/lanzamientos/${slug}`;
  if (module === "sets") return `/musica/${slug}`;
  return "/";
}

function initialSetSource(initial: EditorValues) {
  if (initial.audio_asset_id) return "audio";
  if (initial.soundcloud_url) return "soundcloud_url";
  if (initial.youtube_url) return "youtube_url";
  if (initial.mixcloud_url) return "mixcloud_url";
  if (initial.external_url) return "external_url";
  return "audio";
}

function sourceLabel(key: string) {
  return ({ soundcloud_url: "SoundCloud", youtube_url: "YouTube", mixcloud_url: "Mixcloud", external_url: "Enlace externo" } as Record<string, string>)[key] || "Link";
}

function previewEmbed(source: string, value: string) {
  if (!value) return "";
  if (source === "soundcloud_url") return `https://w.soundcloud.com/player/?url=${encodeURIComponent(value)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  if (source === "mixcloud_url") return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=0&feed=${encodeURIComponent(value)}`;
  if (source === "youtube_url") {
    const id = youtubeId(value);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : "";
  }
  return "";
}

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "");
    if (url.searchParams.get("v")) return url.searchParams.get("v") || "";
    return url.pathname.match(/\/embed\/([^/?]+)/)?.[1] || "";
  } catch {
    return "";
  }
}
