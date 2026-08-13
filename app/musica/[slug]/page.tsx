import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Gauge, MapPin, Music2, Radio } from "lucide-react";
import { SetDetailActions } from "@/components/set-detail-actions";
import { SetAudioPlayer } from "@/components/set-audio-player";
import { contentRepository } from "@/lib/data";
import { absoluteUrl, defaultOgImage, jsonLd, safeDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const sets = await contentRepository.getSets();
  return sets.map((set) => ({ slug: set.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = await contentRepository.getSetBySlug(slug);
  if (!set) return { title: "Set no encontrado" };
  const artist = set.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const description = safeDescription(set.description || "", `${set.title} — set oficial de ${artist}.`);
  const image = set.coverUrl || defaultOgImage;
  return {
    title: `${set.title} · ${set.category}`,
    description,
    alternates: { canonical: `/musica/${set.slug}` },
    robots: set.demo ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${set.title} | ${artist}`,
      description,
      type: "music.playlist",
      url: absoluteUrl(`/musica/${set.slug}`),
      siteName: "IAMJOSHWA",
      locale: "es_MX",
      images: [{ url: image, width: 1200, height: 630, alt: `Portada de ${set.title}` }],
    },
    twitter: { card: "summary_large_image", title: `${set.title} | ${artist}`, description, images: [image] },
  };
}

export default async function SetDetailPage({ params }: Props) {
  const { slug } = await params;
  const sets = await contentRepository.getSets();
  const set = sets.find((item) => item.slug === slug) || null;
  if (!set) notFound();
  const related = sets.filter((item) => item.slug !== set.slug && item.universe === set.universe).slice(0, 3);
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/musica/${set.slug}`;
  const structured = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: set.title,
    byArtist: { "@type": "MusicGroup", name: set.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA" },
    genre: set.genres,
    image: set.coverUrl,
    url: shareUrl,
    numTracks: set.tracklist?.length,
    track: set.tracklist?.map((track, index) => ({ "@type": "MusicRecording", position: index + 1, name: track.title })),
  };

  return (
    <article className="set-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
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
          <p>{set.description || "La nota oficial de esta sesión está reservada para la siguiente actualización del universo."}</p>
          <div className="set-detail-meta">
            <span><MapPin /> {set.location || "Location queued"}</span>
            <span><Radio /> {set.duration || "Duration queued"}</span>
            <span><Gauge /> {set.bpm || "BPM queued"}</span>
            <span><Music2 /> {set.genres.join(" / ") || "Genres queued"}</span>
          </div>
          <SetDetailActions item={set} shareUrl={shareUrl} />
        </div>
      </section>

      <section className="section set-player-lab">
        <div>
          <span className="section-kicker">FULL PLAYER</span>
          <h2>Escucha oficial, sin autoplay.</h2>
          <p>
            El player se carga solo cuando existe un archivo MP3/WAV o una plataforma oficial configurada. La reproducción
            siempre depende de una acción del usuario.
          </p>
        </div>
        {set.audioUrl ? (
          <div className="native-set-player">
            <div>
              <span>{set.audioMimeType === "audio/wav" ? "WAV MASTER" : "MP3 STREAM"}</span>
              <strong>{set.title}</strong>
              <small>{set.category} · {set.duration || "duration queued"}</small>
            </div>
            <SetAudioPlayer item={set} />
          </div>
        ) : set.embedUrl ? (
          <iframe
            src={set.embedUrl}
            title={`Player oficial de ${set.title}`}
            loading="lazy"
            allow="encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <div className="admin-empty public-empty branded-empty">
            <span>AUDIO SIGNAL</span>
            <h2>QUEUED.</h2>
            <p>Esta ficha está lista para recibir MP3/WAV o player oficial de SoundCloud, YouTube o Mixcloud.</p>
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
          <div className="admin-empty public-empty branded-empty">
            <span>TRACKLIST</span>
            <h2>LOCKED.</h2>
            <p>La arquitectura completa del set se revelará cuando el tracklist oficial esté publicado.</p>
          </div>
        )}
      </section>

      <section className="section set-next-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">NEXT IN ROTATION</span>
            <h2>Más sesiones para seguir dentro del universo.</h2>
          </div>
        </div>
        {related.length ? (
          <div className="set-next-grid">
            {related.map((item) => (
              <Link href={`/musica/${item.slug}`} className="set-next-card" key={item.id}>
                <span>{item.category}</span>
                <strong>{item.title}</strong>
                <small>{item.audioUrl ? "Audio propio" : item.provider ? item.provider.toUpperCase() : "Player queued"} · {item.duration || "duration queued"}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="admin-empty public-empty branded-empty">
            <span>NEXT ROTATION</span>
            <h2>INCOMING.</h2>
            <p>Cuando exista otra sesión del mismo universo, esta ficha activará una ruta de escucha automática.</p>
          </div>
        )}
      </section>
    </article>
  );
}
