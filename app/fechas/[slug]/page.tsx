import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { contentRepository } from "@/lib/data";
import { Countdown } from "@/components/countdown";
import { EventActions } from "@/components/event-actions";
import { formatMxDate } from "@/lib/dates";
import { absoluteUrl, defaultOgImage, jsonLd, safeDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await contentRepository.getEvents()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await contentRepository.getEventBySlug(slug);
  if (!event) return { title: "Evento no encontrado" };
  const artist = event.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const date = formatMxDate(event.date, { day: "numeric", month: "long", year: "numeric" });
  const description = safeDescription(event.description, `${artist} en ${event.city} · ${event.venue} · ${date}.`);
  const image = event.flyerUrl || defaultOgImage;

  return {
    title: `${event.name} · ${event.city}`,
    description,
    alternates: { canonical: `/fechas/${event.slug}` },
    robots: event.demo ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${event.name} | ${artist}`,
      description,
      url: absoluteUrl(`/fechas/${event.slug}`),
      type: "website",
      siteName: "IAMJOSHWA",
      locale: "es_MX",
      images: [{ url: image, width: 1200, height: 630, alt: `Flyer de ${event.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} | ${artist}`,
      description,
      images: [image],
    },
  };
}

export default async function EventDetail({ params }: Props) {
  const { slug } = await params;
  const event = await contentRepository.getEventBySlug(slug);
  if (!event) notFound();
  const artist = event.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const json = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.name,
    startDate: event.date,
    eventStatus: schemaStatus(event.status),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(`/fechas/${event.slug}`),
    performer: { "@type": "MusicGroup", name: artist },
    organizer: { "@type": "Organization", name: "IAMJOSHWA" },
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: event.city,
        addressCountry: event.country,
      },
    },
    description: event.description,
    image: event.flyerUrl ? [event.flyerUrl] : [absoluteUrl(defaultOgImage)],
    offers: event.ticketUrl || event.registrationUrl || event.ticketMode === "free"
      ? {
          "@type": "Offer",
          url: event.ticketUrl || event.registrationUrl || absoluteUrl(`/fechas/${event.slug}`),
          price: event.ticketMode === "free" ? "0" : undefined,
          priceCurrency: event.priceLabel.includes("USD") ? "USD" : "MXN",
          availability: event.status === "Sold out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <article className="event-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <div className="event-detail">
        <div className="event-poster">
          {event.flyerUrl && <Image src={event.flyerUrl} alt={`Arte ${event.demo ? "editorial de demostración" : "oficial"} de ${event.name}`} fill priority sizes="(max-width:720px) 100vw, 45vw" />}
          <span className="demo-badge">{event.demo ? "EVENTO DEMO · EDITABLE" : event.universe.toUpperCase()}</span>
          <strong>{event.name}</strong>
        </div>
        <div className="event-info">
          <span className="demo-chip">{event.status}</span>
          <p className="section-kicker">{event.universe.toUpperCase()} PRESENTS</p>
          <h1>{event.name}</h1>
          <p className="event-lead">{event.description}</p>
          <Countdown
            targetDate={event.date}
            type={event.universe === "afterluv" ? "afterluv" : "show"}
            label={event.universe === "afterluv" ? "TRANSMISSION BEGINS IN" : "NEXT SHOW"}
            title={`${event.city} · ${event.venue}`}
            subtitle={event.status}
            source="event_detail"
            contentId={event.id}
            contentType="show"
            completedLabel="SIGNAL ACTIVE"
            completedTitle={event.name}
          />
          <dl>
            <div><dt>Fecha</dt><dd>{formatMxDate(event.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</dd></div>
            <div><dt>Venue</dt><dd>{event.venue}<br />{event.address}</dd></div>
            <div><dt>Horarios</dt><dd>Puertas {event.doors} · Set {event.setTime}</dd></div>
            <div><dt>Lineup</dt><dd>{event.lineup.join(" · ") || "Por anunciar"}</dd></div>
            <div><dt>Acceso</dt><dd>{event.age} · {event.priceLabel}</dd></div>
            {event.promoCode && <div><dt>Código</dt><dd>{event.promoCode}</dd></div>}
          </dl>
          <EventActions event={event} />
          {event.faq?.length ? <section className="event-faq"><h2>Preguntas frecuentes</h2>{event.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section> : null}
          {event.afterContent && <section className="after-content"><span>DESPUÉS DEL EVENTO</span><h2>{event.afterContent.title}</h2><p>{event.afterContent.body}</p></section>}
          <Link className="text-link" href="/fechas">← Volver a fechas</Link>
        </div>
      </div>
    </article>
  );
}

function schemaStatus(status: string) {
  return status === "Cancelado" ? "https://schema.org/EventCancelled" : status === "Reprogramado" ? "https://schema.org/EventRescheduled" : status === "Finalizado" ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled";
}
