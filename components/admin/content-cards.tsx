import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Archive, CheckCircle2, Eye, Pencil, Rocket } from "lucide-react";
import { updatePublicationStatus } from "@/app/admin/module-actions";
import { formatMxDateTime } from "@/lib/dates";
import { DeleteContentButton } from "./delete-content-button";
import { PublicLinkActions } from "./public-link-actions";

type CmsRow = Record<string, unknown> & {
  id: string;
  image_url?: string | null;
  publication_status?: string | null;
  project?: string | null;
};

const statusLabel: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
  archived: "Archivado",
};

type ReadinessItem = {
  label: string;
  state: "ok" | "warning" | "missing";
  detail: string;
};

export function AdminContentCards({ module, rows }: { module: string; rows: CmsRow[] }) {
  if (!rows.length) {
    return (
      <div className="admin-empty content-card-empty">
        <h2>Aún no hay contenido.</h2>
        <p>Crea el primer registro. Puedes guardarlo como borrador y publicarlo cuando esté listo.</p>
      </div>
    );
  }

  return (
    <section className="admin-card-grid">
      {rows.map((row) => {
        const title = String(row.name || row.title || row.slug || "Contenido");
        const date = String(row.starts_at || row.releases_at || row.recorded_at || row.created_at || "");
        const status = String(row.publication_status || "draft");
        const href = publicHref(module, String(row.slug || ""));
        const visibility = visibilityMessage(module, row);
        const readiness = readinessChecklist(module, row);
        const missing = readiness.filter((item) => item.state === "missing").length;
        const warnings = readiness.filter((item) => item.state === "warning").length;
        const readinessState = missing ? "needs-work" : warnings ? "has-warnings" : "is-ready";
        const project = String(row.project || "iamjoshwa").toUpperCase();
        return (
          <article className={`admin-content-card ${readinessState}`} key={row.id}>
            <div className="admin-content-art">
              {row.image_url ? (
                <Image src={row.image_url} alt={`Imagen de ${title}`} fill sizes="(max-width: 760px) 100vw, 33vw" />
              ) : (
                <span>{initials(title)}</span>
              )}
              <small>{statusLabel[status] || status}</small>
            </div>
            <div className="admin-content-body">
              <div>
                <span>{project}</span>
                <h2>{title}</h2>
                <p>{date ? `${formatMxDateTime(date)} MX` : "Sin fecha configurada"}</p>
              </div>
              <div className={`visibility-pill ${visibility.visible ? "is-visible" : "is-hidden"}`}>
                <strong>{visibility.visible ? `Visible en ${project}` : "Oculto"}</strong>
                <span>{visibility.message}</span>
              </div>
              <div className={`publication-readiness ${readinessState}`}>
                <div>
                  {missing ? <AlertTriangle /> : <CheckCircle2 />}
                  <strong>{missing ? `${missing} punto${missing === 1 ? "" : "s"} por completar` : warnings ? "Publicable con mejoras" : "Listo para publicar"}</strong>
                </div>
                <ul>
                  {readiness.map((item) => (
                    <li key={item.label} data-state={item.state}>
                      <span>{item.state === "ok" ? "✓" : item.state === "warning" ? "!" : "×"}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {href ? <PublicLinkActions href={href} canOpen={visibility.visible} /> : null}
              <div className="admin-content-actions">
                <Link className="button secondary" href={`/admin/${module}/${row.id}`}>
                  <Pencil /> Editar
                </Link>
                {status !== "published" ? (
                  <StatusButton module={module} id={row.id} status="published" label="Publicar ahora" icon={<Rocket />} />
                ) : (
                  <StatusButton module={module} id={row.id} status="draft" label="Borrador" icon={<Eye />} />
                )}
                {status !== "archived" && <StatusButton module={module} id={row.id} status="archived" label="Archivar" icon={<Archive />} tone="danger" />}
                <DeleteContentButton module={module} id={row.id} title={title} compact />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function publicHref(module: string, slug: string) {
  if (!slug) return "";
  if (module === "eventos") return `/fechas/${slug}`;
  if (module === "lanzamientos") return `/lanzamientos/${slug}`;
  if (module === "sets") return `/musica/${slug}`;
  return "";
}

function visibilityMessage(module: string, row: CmsRow) {
  const status = String(row.publication_status || "draft");
  if (status !== "published") {
    return {
      visible: false,
      message: status === "archived" ? "Está archivado y no aparece en la web." : status === "scheduled" ? "Está programado; aparecerá cuando se publique." : "Está guardado como borrador.",
    };
  }
  if (module === "sets" && !row.audio_asset_id && !row.soundcloud_url && !row.youtube_url && !row.mixcloud_url && !row.external_url) {
    return { visible: false, message: "Publicado, pero sin audio ni link de plataforma." };
  }
  const releaseLinks = Array.isArray(row.release_links) ? row.release_links : [];
  if (module === "lanzamientos" && dateHasPassed(row.releases_at) && !releaseLinks.length) {
    return { visible: true, message: "Publicado. Agrega links de plataformas para que diga Escuchar ahora." };
  }
  return { visible: true, message: "La página pública está disponible." };
}

function readinessChecklist(module: string, row: CmsRow): ReadinessItem[] {
  if (module === "eventos") {
    return [
      check(Boolean(row.slug), "Slug público", "Necesario para abrir /fechas/[slug].", "Agrega un slug antes de compartir."),
      check(Boolean(row.starts_at), "Fecha del evento", "El evento puede ordenarse y mostrar countdown.", "Agrega fecha y hora de inicio."),
      check(Boolean(row.image_url || row.flyer_asset_id), "Flyer", "La tarjeta se ve profesional con flyer.", "Asigna un flyer desde Media."),
      check(Boolean(row.venue && row.city), "Venue y ciudad", "Los fans y promotores entienden dónde será.", "Completa venue y ciudad."),
      check(Boolean(row.ticket_url), "Boletos", "El CTA de compra está listo.", "Si aún no hay boletos, publica como anuncio o agrega waitlist.", "warning"),
    ];
  }
  if (module === "sets") {
    const hasPlayer = Boolean(row.audio_asset_id || row.soundcloud_url || row.youtube_url || row.mixcloud_url || row.external_url);
    return [
      check(Boolean(row.slug), "Slug público", "Necesario para abrir /musica/[slug].", "Agrega un slug antes de compartir."),
      check(Boolean(row.image_url || row.cover_asset_id), "Portada", "El set tendrá cover visual en la web.", "Asigna portada desde Media."),
      check(hasPlayer, "Audio o plataforma", "Puede reproducirse con MP3/WAV o abrir SoundCloud, YouTube, Mixcloud o link externo.", "Sube audio o pega un link de plataforma."),
      check(Boolean(row.recorded_at), "Fecha de grabación", "Ayuda a ordenar la biblioteca.", "Agrega fecha si quieres que se vea más completo.", "warning"),
      check(hasArrayContent(row.genres), "Géneros", "Los filtros y la experiencia musical quedan claros.", "Agrega géneros para mejorar descubrimiento.", "warning"),
    ];
  }
  if (module === "lanzamientos") {
    const releaseLinks = Array.isArray(row.release_links) ? row.release_links : [];
    const hasPlatform = releaseLinks.length > 0;
    const future = row.releases_at ? new Date(String(row.releases_at)).getTime() > Date.now() : false;
    return [
      check(Boolean(row.slug), "Slug público", "Necesario para abrir /lanzamientos/[slug].", "Agrega un slug antes de compartir."),
      check(Boolean(row.image_url || row.cover_asset_id), "Portada", "La canción tendrá presencia visual premium.", "Asigna portada desde Media."),
      check(Boolean(row.releases_at), "Fecha de salida", "Activa countdown, pre-save o escuchar ahora.", "Agrega fecha y hora de lanzamiento."),
      check(Boolean(row.presave_url || hasPlatform), future ? "Pre-save o plataformas" : "Links de plataformas", future ? "El CTA puede mostrar Haz pre-save." : "El CTA puede mostrar Escuchar ahora.", "Agrega Spotify, Apple, YouTube, SoundCloud o pre-save."),
      check(Boolean(row.story), "Historia", "El lanzamiento se siente editorial y oficial.", "Agrega una historia corta del lanzamiento.", "warning"),
    ];
  }
  return [];
}

function check(condition: boolean, label: string, ok: string, fail: string, failState: "warning" | "missing" = "missing"): ReadinessItem {
  return {
    label,
    state: condition ? "ok" : failState,
    detail: condition ? ok : fail,
  };
}

function hasArrayContent(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function dateHasPassed(value: unknown) {
  if (!value) return false;
  const date = new Date(String(value));
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

function StatusButton({ module, id, status, label, icon, tone }: { module: string; id: string; status: string; label: string; icon: ReactNode; tone?: "danger" }) {
  return (
    <form action={updatePublicationStatus}>
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="contentId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`button ${tone === "danger" ? "danger-button" : "primary"}`}>
        {icon}
        {label}
      </button>
    </form>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
