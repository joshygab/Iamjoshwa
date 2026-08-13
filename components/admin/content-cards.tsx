import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, Eye, Pencil, Rocket } from "lucide-react";
import { updatePublicationStatus } from "@/app/admin/module-actions";

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
        return (
          <article className="admin-content-card" key={row.id}>
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
                <span>{String(row.project || "IAMJOSHWA").toUpperCase()}</span>
                <h2>{title}</h2>
                <p>{date ? new Date(date).toLocaleString("es-MX") : "Sin fecha configurada"}</p>
              </div>
              <div className="admin-content-actions">
                <Link className="button secondary" href={`/admin/${module}/${row.id}`}>
                  <Pencil /> Editar
                </Link>
                {status !== "published" ? (
                  <StatusButton module={module} id={row.id} status="published" label="Publicar" icon={<Rocket />} />
                ) : (
                  <StatusButton module={module} id={row.id} status="draft" label="Borrador" icon={<Eye />} />
                )}
                {status !== "archived" && <StatusButton module={module} id={row.id} status="archived" label="Archivar" icon={<Archive />} tone="danger" />}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
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
