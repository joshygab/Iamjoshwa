import { MusicHub } from "@/components/music-hub";
import { MusicLibrary } from "@/components/music-library";
import { PageHero } from "@/components/page-hero";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/musica",
  title: "Music Hub",
  description: "Sets, lanzamientos y plataformas oficiales de IAMJOSHWA y AFTERLUV.",
});

export default async function MusicPage() {
  const [sets, releases] = await Promise.all([
    contentRepository.getSets(),
    contentRepository.getReleases(),
  ]);

  return (
    <>
      <PageHero
        kicker="MUSIC HUB"
        title="Todo empieza con darle play."
        description="Sets oficiales, lanzamientos, contexto, plataformas y fichas completas. Nunca reproducimos automáticamente."
      />
      <section className="section music-hub-section">
        <MusicHub sets={sets} releases={releases} />
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">SETS & MIXES</span>
            <h2>Sesiones oficiales.</h2>
          </div>
          <p className="muted">Cada set puede abrir su ficha, tracklist, player oficial y acciones de share.</p>
        </div>
        <MusicLibrary items={sets} />
      </section>
    </>
  );
}
