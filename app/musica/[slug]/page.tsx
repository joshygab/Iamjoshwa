import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Gauge, MapPin, Music2, Radio } from "lucide-react";
import { SetDetailActions } from "@/components/set-detail-actions";
import { contentRepository } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const sets = await contentRepository.getSets();
  return sets.map((set) => ({ slug: set.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = await contentRepository.getSetBySlug(slug);
  if (!set) return { title: "Set no encontrado" };
  const description = set.description || `${set.title} — set oficial de ${set.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA"}.`;
  return {
    title: set.title,
    description,
    alternates: { canonical: `/musica/${set.slug}` },
    openGraph: {
      title: `${set.title} | IAMJOSHWA`,
      description,
      type: "music.playlist",
      images: set.coverUrl ? [{ url: set.coverUrl, alt: `Portada de ${set.title}` }] : undefined,
    },
    twitter: { card: "summary_large_image", images: set.coverUrl ? [set.coverUrl] : undefined },
  };
}

export default async function SetDetailPage({ params }: Props) {
  const { slug } = await params;
  const set = await contentRepository.getSetBySlug(slug);
  if (!set) notFound();
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/musica/${set.slug}`;
  const structured = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: set.title,
    byArtist: { "@type": "MusicGroup", name: set.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA" },
    genre: set.genres,
    image: set.coverUrl,
    url: shareUrl,
  };

  return (
    <article className="set-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
      <Link className="text-link set-back" href="/musica">
        <ArrowLeft /> Todos los sets
      </Link>
      <section className="set-detail-hero">
        <div className="set-detail-cover">
          {set.coverUrl ? (
            <Image src={set.coverUrl} alt={`Portada de ${set.title}`} fill priority sizes="(max-width: 900px) 100vw, 42vw" />
          ) : (
            <span>{set.category}</span>
          )}
          <div className="set-energy" aria-label={`Energía ${set.energy} de 5`}>
            {"●".repeat(set.energy)}{"○".repeat(5 - set.energy)}
          </div>
        </div>
        <div className="set-detail-copy">
          <span className="section-kicker">{set.universe.toUpperCase()} · {set.category}</span>
          <h1>{set.title}</h1>
          <p>{set.description || "Descripción oficial pendiente de publicar desde el admin."}</p>
          <div className="set-detail-meta">
            <span><MapPin /> {set.location || "Lugar por confirmar"}</span>
            <span><Radio /> {set.duration || "Duración pendiente"}</span>
            <span><Gauge /> {set.bpm || "BPM pendiente"}</span>
            <span><Music2 /> {set.genres.join(" / ") || "Géneros pendientes"}</span>
          </div>
          <SetDetailActions item={set} shareUrl={shareUrl} />
        </div>
      </section>

      <section className="section set-player-lab">
        <div>
          <span className="section-kicker">FULL PLAYER</span>
          <h2>Escucha oficial, sin autoplay.</h2>
          <p>
            El player se carga solo cuando existe una plataforma oficial configurada. La reproducción
            siempre depende de una acción del usuario.
          </p>
        </div>
        {set.embedUrl ? (
          <iframe
            src={set.embedUrl}
            title={`Player oficial de ${set.title}`}
            loading="lazy"
            allow="encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <div className="admin-empty public-empty">
            <h2>Player pendiente.</h2>
            <p>Agrega un link de SoundCloud, YouTube o Mixcloud desde el admin para activar esta zona.</p>
          </div>
        )}
        <aside className="set-reward-card">
          <span>JOSH PASS READY</span>
          <h2>Puntos por escuchar.</h2>
          <p>
            La acción de abrir un set ya queda preparada para registrar actividad segura cuando el fan
            inicia sesión. El frontend nunca otorga puntos directamente.
          </p>
        </aside>
      </section>

      <section className="section set-tracklist-section">
        <div>
          <span className="section-kicker">TRACKLIST</span>
          <h2>La arquitectura del set.</h2>
        </div>
        {set.tracklist?.length ? (
          <ol className="set-detail-tracklist">
            {set.tracklist.map((track, index) => (
              <li key={`${track.time}-${track.title}-${index}`}>
                <time>{track.time}</time>
                <span>{track.title}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="admin-empty public-empty">
            <h2>Tracklist pendiente.</h2>
            <p>Cuando agregues tracks desde el admin aparecerán aquí.</p>
          </div>
        )}
      </section>
    </article>
  );
}
