import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { ReleaseLibrary } from "@/components/release-library";
import { PageHero } from "@/components/page-hero";
import { SectionUnavailable } from "@/components/section-unavailable";
import { createLabelGetter } from "@/lib/cms/labels";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/lanzamientos",
  title: "Lanzamientos",
  description: "Pre-saves, canciones, visualizers y links oficiales de plataformas de IAMJOSHWA y AFTERLUV.",
});

export default async function ReleasesPage() {
  const [items, labels, section] = await Promise.all([contentRepository.getReleases(), contentRepository.getLabels(), contentRepository.getPublicSection("releases")]);
  const label = createLabelGetter(labels);

  return (
    <>
      {section === null ? <SectionUnavailable title={label("releases.hidden", "RELEASE SIGNAL HIDDEN")} body={label("releases.empty", "El siguiente lanzamiento todavía no fue revelado.")} /> : null}
      {section === null ? null : (
      <>
      <PageHero kicker={label("releases.kicker", "RELEASES")} title={label("releases.title", "Lo próximo ya está vibrando.")} description={label("releases.subtitle", "Pre-save antes del estreno y plataformas oficiales después de la fecha configurada.")} />
      <section className="section">
        <ReleaseLibrary items={items} />
        <div className="vault-callout active-vault-callout">
          <LockKeyhole />
          <span>EXPERIENCIA ACTIVA</span>
          <h2>{label("nav.vault", "THE VAULT")}</h2>
          <p>{label("vault.releaseCallout", "Demos autorizados, edits, mashups, versiones extendidas, sets privados y descargas limitadas desbloqueables con IAMJOSHWA Pass.")}</p>
          <Link className="button secondary" href="/the-vault">
            Entrar al Vault <ArrowRight />
          </Link>
        </div>
      </section>
      </>
      )}
    </>
  );
}
