import { PageHero } from "@/components/page-hero";
import { EpkContent } from "@/components/public-cms-content";
import { contentRepository } from "@/lib/data";

export const metadata = {
  title: "EPK",
  description: "Electronic Press Kit oficial de IAMJOSHWA y AFTERLUV para promotores, venues y medios.",
  alternates: { canonical: "/epk" },
  openGraph: {
    title: "IAMJOSHWA / AFTERLUV — EPK",
    description: "Bio, shows, press photos, formatos de set y material de booking.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "IAMJOSHWA EPK" }],
  },
};

export default async function EpkPage() {
  const [artists, sections, events, media] = await Promise.all([contentRepository.getArtists(), contentRepository.getEpk(), contentRepository.getEvents(), contentRepository.getMedia()]);

  return (
    <>
      <PageHero kicker="ELECTRONIC PRESS KIT" title="IAMJOSHWA / AFTERLUV" description="Material profesional para promotores, venues y medios." />
      <EpkContent artists={artists} sections={sections} events={events} media={media} />
    </>
  );
}
