import { HomeContent } from "@/components/universe-content";
import { contentRepository } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

const requestTime = Date.now();

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [events, sets, releases, artists, sections] = await Promise.all([
    contentRepository.getEvents(),
    contentRepository.getSets(),
    contentRepository.getReleases(),
    contentRepository.getArtists(),
    contentRepository.getPageSections(),
  ]);

  const structured = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "IAMJOSHWA",
    alternateName: "AFTERLUV",
    description: "DJ y productor de Ciudad de México con universos IAMJOSHWA y AFTERLUV.",
    foundingLocation: { "@type": "City", name: "Ciudad de México" },
    genre: artists.flatMap((artist) => artist.genres),
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      {!isSupabaseConfigured ? (
        <div className="demo-notice">
          VISTA EDITORIAL · Fechas, lanzamientos y sets marcados como demo se reemplazarán con información oficial.
        </div>
      ) : null}
      <HomeContent
        events={events}
        sets={sets}
        releases={releases}
        artists={artists}
        sections={sections}
        now={requestTime}
      />
    </>
  );
}
