"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Mail, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUniverse } from "./universe-provider";
import type { ArtistProfileItem, EpkSectionItem, EventItem, MediaGalleryItem, TimelineItem } from "@/types/content";

export function MediaGallery({ items }: { items: MediaGalleryItem[] }) {
  const { universe } = useUniverse();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const visible = items.filter((item) => !item.project || item.project === universe);
  const selected = selectedIndex == null ? null : visible[selectedIndex];

  useEffect(() => {
    if (!selected) return;
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowRight") setSelectedIndex((index) => (index == null ? index : (index + 1) % visible.length));
      if (event.key === "ArrowLeft") setSelectedIndex((index) => (index == null ? index : (index - 1 + visible.length) % visible.length));
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected, visible.length]);

  if (!visible.length) return <Empty title="VISUAL ARCHIVE LOCKED" />;

  return (
    <>
      <section className="section media-gallery">
        {visible.map((item, index) => (
          <article key={item.id}>
            <button className="media-open" onClick={() => setSelectedIndex(index)} aria-label={`Ampliar ${item.title}`}>
              <Image priority src={item.url} alt={item.alt} width={1200} height={900} sizes="(max-width: 720px) 100vw, 50vw" />
            </button>
            <div>
              <span>{item.demo ? "DEMO EDITABLE" : item.type}</span>
              <h2>{item.title}</h2>
              <p>{item.caption}</p>
            </div>
          </article>
        ))}
      </section>

      {selected && (
        <div className="lightbox pro-lightbox" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelectedIndex(null)}>
          <button className="lightbox-close" aria-label="Cerrar imagen" onClick={() => setSelectedIndex(null)}>
            <X />
          </button>
          <button className="lightbox-nav prev" aria-label="Imagen anterior" onClick={(event) => { event.stopPropagation(); setSelectedIndex((index) => (index == null ? index : (index - 1 + visible.length) % visible.length)); }}>
            <ChevronLeft />
          </button>
          <Image src={selected.url} alt={selected.alt} width={1800} height={1200} sizes="95vw" onClick={(event) => event.stopPropagation()} />
          <button className="lightbox-nav next" aria-label="Imagen siguiente" onClick={(event) => { event.stopPropagation(); setSelectedIndex((index) => (index == null ? index : (index + 1) % visible.length)); }}>
            <ChevronRight />
          </button>
          <div className="lightbox-caption" onClick={(event) => event.stopPropagation()}>
            <span>{selected.type}</span>
            <h2>{selected.title}</h2>
            <p>{selected.caption}</p>
          </div>
        </div>
      )}
    </>
  );
}

export function ArtistStory({ artists, items }: { artists: ArtistProfileItem[]; items: TimelineItem[] }) {
  const { universe } = useUniverse();
  const artist = artists.find((item) => item.project === universe);
  const visible = items.filter((item) => !item.project || item.project === universe);
  return (
    <section className="section story">
      <span>{artist?.displayName || universe.toUpperCase()}</span>
          <h2>{artist?.tagline || "Artist story loading."}</h2>
      {artist?.longBio && <p>{artist.longBio}</p>}
      <div className="tag-row">{artist?.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
      {visible.map((item) => (
        <article key={item.id}>
          <time>{item.occurredAt ? new Date(item.occurredAt).toLocaleDateString("es-MX", { year: "numeric", month: "long" }) : "INFORMACIÓN PENDIENTE"}</time>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      ))}
    </section>
  );
}

export function EpkContent({ artists, sections, events, media }: { artists: ArtistProfileItem[]; sections: EpkSectionItem[]; events: EventItem[]; media: MediaGalleryItem[] }) {
  const { universe } = useUniverse();
  const artist = artists.find((item) => item.project === universe);
  const visible = sections.filter((item) => !item.project || item.project === universe);
  const dates = events.filter((item) => item.universe === universe && item.status !== "Finalizado").slice(0, 3);
  const photos = media.filter((item) => !item.project || item.project === universe).slice(0, 2);

  return (
    <section className="section epk">
      <div className="epk-intro">
        <div>
          <span className="section-kicker">BIOGRAFÍA OFICIAL</span>
          <h2>{artist?.displayName || universe.toUpperCase()}</h2>
          <div className="tag-row">{artist?.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
        </div>
        <div>
          <p>{artist?.longBio || "La narrativa oficial está en preparación. Para prensa, booking o riders, usa el contacto profesional del EPK."}</p>
          <button className="button secondary" onClick={() => window.print()}>
            <Printer /> Imprimir EPK
          </button>
        </div>
      </div>

      <div className="epk-grid">
        <article><span>BASE</span><p>{artist?.baseCity || "Ciudad de México"}</p></article>
        <article><span>BIO CORTA</span><p>{artist?.shortBio || "DJ y productor de Ciudad de México con una plataforma oficial para shows, música, EPK y booking."}</p></article>
        {visible.map((item) => (
          <article key={item.id}>
            <span>{item.sectionKey.replaceAll("_", " ")}</span>
            <p>{contentText(item.content)}</p>
          </article>
        ))}
      </div>

      <section className="epk-press">
        <div>
          <span className="section-kicker">PRESS MATERIAL</span>
          <h2>Imágenes y logotipos</h2>
        </div>
        <div className="press-grid">
          {photos.length ? photos.map((item) => (
            <div className="epk-photo" key={item.id}>
              <Image src={item.url} alt={item.alt} fill sizes="(max-width:720px) 100vw, 50vw" />
              <span>{item.demo ? "PLACEHOLDER EDITABLE" : item.title}</span>
              <a className="epk-photo-download" href={item.url} download target="_blank" rel="noreferrer">
                <Download /> Descargar
              </a>
            </div>
          )) : <div>PRESS PHOTOS<br /><small>Solicitar por booking</small></div>}
        </div>
      </section>

      <section className="epk-dates">
        <span className="section-kicker">PRÓXIMAS FECHAS</span>
        {dates.map((date) => (
          <Link href={`/fechas/${date.slug}`} key={date.id}>
            <time>{new Date(date.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</time>
            <strong>{date.name}</strong>
            <span>{date.city}</span>
          </Link>
        ))}
      </section>

      <section className="epk-final-panel">
        <div>
          <span className="section-kicker">PRESS KIT READY</span>
          <h2>Material para promotores y prensa.</h2>
          <p>Imprime esta versión, descarga las fotografías públicas disponibles o solicita riders y materiales privados mediante booking. Ningún documento privado se expone sin autorización.</p>
        </div>
        <div className="epk-action-grid">
          <button className="button secondary" onClick={() => window.print()}><Printer /> Imprimir EPK</button>
          <Link className="button secondary" href="/media"><Download /> Ver media pública</Link>
          <Link className="button secondary" href="/fechas"><CalendarDays /> Próximos shows</Link>
          <Link className="button primary" href="/booking"><Mail /> Solicitar riders / booking</Link>
        </div>
      </section>
    </section>
  );
}

function contentText(content: Record<string, unknown>) {
  return Object.values(content).filter((item): item is string => typeof item === "string").join(" · ") || "Disponible bajo solicitud.";
}

function Empty({ title }: { title: string }) {
  return (
    <section className="section empty-state">
      <span>ARCHIVO</span>
      <h2>{title}</h2>
      <p>Signal queued. Esta sección se activa únicamente con material oficial.</p>
    </section>
  );
}
