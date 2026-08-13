import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ExternalLink, Music2, Share2, Sparkles } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { TrackedLink } from "@/components/tracked-link";
import { contentRepository } from "@/lib/data";
import { absoluteUrl, defaultOgImage, jsonLd, safeDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const releases = await contentRepository.getReleases();
  return releases.map((release) => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = await contentRepository.getReleaseBySlug(slug);
  if (!release) return { title: "Lanzamiento no encontrado" };
  const artist = release.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const description = safeDescription(release.story || "", `${release.title} — lanzamiento oficial de ${artist}.`);
  const image = release.coverUrl || defaultOgImage;
  return {
    title: `${release.title} · ${release.type}`,
    description,
    alternates: { canonical: `/lanzamientos/${release.slug}` },
    robots: release.demo ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${release.title} | ${artist}`,
      description,
      type: "music.song",
      url: absoluteUrl(`/lanzamientos/${release.slug}`),
      siteName: "IAMJOSHWA",
      locale: "es_MX",
      images: [{ url: image, width: 1200, height: 630, alt: `Portada de ${release.title}` }],
    },
    twitter: { card: "summary_large_image", title: `${release.title} | ${artist}`, description, images: [image] },
  };
}

export default async function ReleaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const release = await contentRepository.getReleaseBySlug(slug);
  if (!release) notFound();
  const future = new Date(release.releaseAt) > new Date();
  const primaryUrl = future ? release.presaveUrl : release.listenUrl || release.platforms?.[0]?.url;
  const visualizer = release.visualizerUrl || youtubeEmbed(release.platforms?.find((link) => /youtube|youtu\.be/i.test(`${link.label} ${link.url}`))?.url);
  const structured = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: release.title,
    byArtist: { "@type": "MusicGroup", name: release.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA" },
    datePublished: release.releaseAt,
    image: release.coverUrl,
    url: absoluteUrl(`/lanzamientos/${release.slug}`),
    sameAs: release.platforms?.map((link) => link.url),
    potentialAction: {
      "@type": "ListenAction",
      target: release.listenUrl || release.presaveUrl || release.platforms?.[0]?.url || absoluteUrl(`/lanzamientos/${release.slug}`),
    },
  };

  return (
    <article className="release-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
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
          {future ? (
            <Countdown
              targetDate={release.releaseAt}
              type={release.universe === "afterluv" ? "afterluv" : "release"}
              label={release.universe === "afterluv" ? "TRANSMISSION BEGINS IN" : "DROPS IN"}
              title={release.title}
              subtitle={release.type}
              source="release_detail"
              contentId={release.id}
              contentType="release"
              completedLabel="OUT NOW"
              completedTitle={release.title}
              completedSubtitle="El lanzamiento ya llegó a su fecha de publicación."
              completedHref={release.listenUrl || release.platforms?.[0]?.url}
              completedCta="Listen"
            />
          ) : <p className="release-live"><Sparkles /> Ya disponible en plataformas oficiales.</p>}
          <div className="inline-actions">
            {primaryUrl ? (
              <TrackedLink className="button primary" href={primaryUrl} target="_blank" rel="noreferrer" action={future ? "presave_click" : "release_listen_click"} entityType="releases" entityId={release.id} label={release.title}>
                {future ? "Haz pre-save" : "Escuchar ahora"} <ExternalLink />
              </TrackedLink>
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
                <TrackedLink key={link.label} href={link.url} target="_blank" rel="noreferrer" action="platform_click" entityType="releases" entityId={release.id} label={link.label}>
                  <span>{link.label}</span>
                  <ExternalLink />
                </TrackedLink>
              ))}
            </div>
          ) : null}
          {visualizer ? (
            <section className="release-visualizer">
              <span>VISUALIZER</span>
              <iframe src={visualizer} title={`Visualizer de ${release.title}`} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" />
            </section>
          ) : null}
          {release.credits?.length ? (
            <section className="release-credits">
              <span>CRÉDITOS</span>
              {release.credits.map((credit) => <p key={credit}>{credit}</p>)}
            </section>
          ) : null}
        </div>
      </section>

      <section className="section release-story-lab">
        <article>
          <span>BEHIND THE TRACK</span>
          <h2>Historia, intención y momento.</h2>
          <p>
            {release.story ||
              "Cuando publiques la historia desde el admin, esta zona se convierte en el contexto editorial del lanzamiento."}
          </p>
        </article>
        <article>
          <span>OFFICIAL LINKS</span>
          <h2>Plataformas verificadas.</h2>
          {release.platforms?.length ? (
            <div className="platform-grid release-lab-platforms">
              {release.platforms.map((link) => (
                <TrackedLink key={`lab-${link.label}`} href={link.url} target="_blank" rel="noreferrer" action="platform_click" entityType="releases" entityId={release.id} label={link.label}>
                  <span>{link.label}</span>
                  <ExternalLink />
                </TrackedLink>
              ))}
            </div>
          ) : (
            <p>Agrega Spotify, Apple Music, YouTube, SoundCloud, Beatport u otras plataformas desde Admin → Lanzamientos.</p>
          )}
        </article>
        <article>
          <span>FAN JOURNEY</span>
          <h2>{future ? "Pre-save primero." : "Escucha y comparte."}</h2>
          <p>
            {future
              ? "Antes del estreno, el CTA principal empuja al pre-save. Al llegar la fecha cambia automáticamente a escuchar ahora."
              : "Después del estreno, los links oficiales quedan listos para clicks, métricas y campañas futuras."}
          </p>
        </article>
      </section>
    </article>
  );
}

function youtubeEmbed(url?: string) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://www.youtube.com/embed/${id}` : undefined;
  } catch {
    return undefined;
  }
}
