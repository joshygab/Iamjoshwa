import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ExternalLink, Music2, Share2, Sparkles } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { contentRepository } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const releases = await contentRepository.getReleases();
  return releases.map((release) => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = await contentRepository.getReleaseBySlug(slug);
  if (!release) return { title: "Lanzamiento no encontrado" };
  const description = release.story || `${release.title} — lanzamiento oficial de ${release.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA"}.`;
  return {
    title: release.title,
    description,
    alternates: { canonical: `/lanzamientos/${release.slug}` },
    openGraph: {
      title: `${release.title} | IAMJOSHWA`,
      description,
      type: "music.song",
      images: release.coverUrl ? [{ url: release.coverUrl, alt: `Portada de ${release.title}` }] : undefined,
    },
    twitter: { card: "summary_large_image", images: release.coverUrl ? [release.coverUrl] : undefined },
  };
}

export default async function ReleaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const release = await contentRepository.getReleaseBySlug(slug);
  if (!release) notFound();
  const future = new Date(release.releaseAt) > new Date();
  const primaryUrl = future ? release.presaveUrl : release.listenUrl || release.platforms?.[0]?.url;
  const structured = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: release.title,
    byArtist: { "@type": "MusicGroup", name: release.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA" },
    datePublished: release.releaseAt,
    image: release.coverUrl,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/lanzamientos/${release.slug}`,
  };

  return (
    <article className="release-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
      <Link className="text-link release-back" href="/lanzamientos">
        <ArrowLeft /> Todos los lanzamientos
      </Link>
      <section className="release-detail-hero">
        <div className="release-detail-cover">
          {release.coverUrl ? (
            <Image src={release.coverUrl} alt={`Portada de ${release.title}`} fill priority sizes="(max-width: 900px) 100vw, 42vw" />
          ) : (
            <span>{release.title}</span>
          )}
        </div>
        <div className="release-detail-copy">
          <span className="section-kicker">{release.universe.toUpperCase()} · {release.type}</span>
          <h1>{release.title}</h1>
          <p>{release.story || "La historia oficial de este lanzamiento se puede editar desde el admin."}</p>
          <div className="release-detail-meta">
            <span><CalendarDays /> {new Date(release.releaseAt).toLocaleString("es-MX")}</span>
            <span><Music2 /> {future ? "Pre-save activo" : "Disponible ahora"}</span>
          </div>
          {future ? <Countdown date={release.releaseAt} /> : <p className="release-live"><Sparkles /> Ya disponible en plataformas oficiales.</p>}
          <div className="inline-actions">
            {primaryUrl ? (
              <a className="button primary" href={primaryUrl} target="_blank" rel="noreferrer">
                {future ? "Haz pre-save" : "Escuchar ahora"} <ExternalLink />
              </a>
            ) : (
              <button className="button primary" disabled>{future ? "Pre-save pendiente" : "Links pendientes"}</button>
            )}
            <a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`Escucha ${release.title}: ${process.env.NEXT_PUBLIC_SITE_URL || ""}/lanzamientos/${release.slug}`)}`} target="_blank" rel="noreferrer">
              Compartir <Share2 />
            </a>
          </div>
          {release.platforms?.length ? (
            <div className="platform-grid release-detail-platforms">
              {release.platforms.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                  <span>{link.label}</span>
                  <ExternalLink />
                </a>
              ))}
            </div>
          ) : null}
          {release.credits?.length ? (
            <section className="release-credits">
              <span>CRÉDITOS</span>
              {release.credits.map((credit) => <p key={credit}>{credit}</p>)}
            </section>
          ) : null}
        </div>
      </section>
    </article>
  );
}
