import { PageHero } from "@/components/page-hero";
import { EpkContent } from "@/components/public-cms-content";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/epk",
  title: "EPK",
  description: "Electronic Press Kit oficial de IAMJOSHWA y AFTERLUV para promotores, venues y medios.",
});

export default async function EpkPage() {
  const [artists, sections, events, media] = await Promise.all([contentRepository.getArtists(), contentRepository.getEpk(), contentRepository.getEvents(), contentRepository.getMedia()]);

  return (
    <>
      <PageHero kicker="ELECTRONIC PRESS KIT" title="IAMJOSHWA / AFTERLUV" description="Material profesional para promotores, venues y medios." />
      <EpkContent artists={artists} sections={sections} events={events} media={media} />
    </>
  );
}
