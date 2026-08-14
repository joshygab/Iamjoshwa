import { MusicHub } from "@/components/music-hub";
import { MusicLibrary } from "@/components/music-library";
import { PageHero } from "@/components/page-hero";
import { SectionUnavailable } from "@/components/section-unavailable";
import { createLabelGetter } from "@/lib/cms/labels";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/musica",
  title: "Music Hub",
  description: "Sets, lanzamientos y plataformas oficiales de IAMJOSHWA y AFTERLUV.",
});

export default async function MusicPage() {
  const [sets, releases, labels, section] = await Promise.all([
    contentRepository.getSets(),
    contentRepository.getReleases(),
    contentRepository.getLabels(),
    contentRepository.getPublicSection("music"),
  ]);
  const label = createLabelGetter(labels);

  return (
    <>
      {section === null ? <SectionUnavailable title={label("music.hidden", "MUSIC SIGNAL HIDDEN")} body={label("music.empty", "La música oficial está en preparación desde el Control Room.")} /> : null}
      {section === null ? null : (
      <>
      <PageHero
        kicker={label("music.kicker", "MUSIC HUB")}
        title={label("music.title", "Todo empieza con darle play.")}
        description={label("music.subtitle", "Sets oficiales, lanzamientos, contexto, plataformas y fichas completas. Nunca reproducimos automáticamente.")}
      />
      <section className="section music-hub-section">
        <MusicHub sets={sets} releases={releases} />
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{label("music.sets.kicker", "SETS & MIXES")}</span>
            <h2>{label("music.sets.title", "Sesiones oficiales.")}</h2>
          </div>
          <p className="muted">Cada set puede abrir su ficha, tracklist, player oficial y acciones de share.</p>
        </div>
        <MusicLibrary items={sets} />
      </section>
      </>
      )}
    </>
  );
}
