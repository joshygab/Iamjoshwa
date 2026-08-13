import { EventList } from "@/components/event-list";
import { PageHero } from "@/components/page-hero";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

const renderTimestamp = Date.now();

export const generateMetadata = () => pageMetadata({
  path: "/fechas",
  title: "Shows",
  description: "Fechas oficiales, boletos, mapas, calendarios e historial de IAMJOSHWA y AFTERLUV.",
});

export default async function EventsPage() {
  const items = await contentRepository.getEvents();

  return (
    <>
      <PageHero kicker="LIVE SIGNAL" title="Shows, rituales y noches oficiales." description="Filtra próximas fechas, archivo, ciudades, boletos, mapas y calendarios por universo." />
      <section className="section shows-section">
        <EventList items={items} now={renderTimestamp} />
      </section>
    </>
  );
}
