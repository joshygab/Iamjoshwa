import { EventList } from "@/components/event-list";
import { PageHero } from "@/components/page-hero";
import { SectionUnavailable } from "@/components/section-unavailable";
import { createLabelGetter, systemEnabled } from "@/lib/cms/labels";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

const renderTimestamp = Date.now();

export const generateMetadata = () => pageMetadata({
  path: "/fechas",
  title: "Shows",
  description: "Fechas oficiales, boletos, mapas, calendarios e historial de IAMJOSHWA y AFTERLUV.",
});

export default async function EventsPage() {
  const [items, labels, settings, section] = await Promise.all([
    contentRepository.getEvents(),
    contentRepository.getLabels(),
    contentRepository.getPublicSettings(),
    contentRepository.getPublicSection("shows"),
  ]);
  const label = createLabelGetter(labels);
  const hidden = systemEnabled(settings, "hide_upcoming_shows");

  return (
    <>
      {section === null ? <SectionUnavailable title={label("shows.hidden", "LIVE SIGNALS HIDDEN")} body={label("shows.empty", "La próxima transmisión oficial todavía no fue revelada.")} /> : null}
      {section === null ? null : (
      <>
      <PageHero kicker={label("shows.kicker", "LIVE SIGNAL")} title={label("shows.title", "Shows, rituales y noches oficiales.")} description={label("shows.subtitle", "Filtra próximas fechas, archivo, ciudades, boletos, mapas y calendarios por universo.")} />
      <section className="section shows-section">
        {hidden ? <div className="admin-empty public-empty branded-empty"><span>NEXT SIGNAL</span><h2>{label("global.comingSoon", "COMING SOON")}</h2><p>{label("shows.empty", "La próxima transmisión oficial todavía no fue revelada.")}</p></div> : <EventList items={items} now={renderTimestamp} />}
      </section>
      </>
      )}
    </>
  );
}
