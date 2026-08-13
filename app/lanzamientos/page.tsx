import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { ReleaseLibrary } from "@/components/release-library";
import { PageHero } from "@/components/page-hero";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata({
  path: "/lanzamientos",
  title: "Lanzamientos",
  description: "Pre-saves, canciones, visualizers y links oficiales de plataformas de IAMJOSHWA y AFTERLUV.",
});

export default async function ReleasesPage() {
  const items = await contentRepository.getReleases();

  return (
    <>
      <PageHero kicker="RELEASES" title="Lo próximo ya está vibrando." description="Pre-save antes del estreno y plataformas oficiales después de la fecha configurada." />
      <section className="section">
        <ReleaseLibrary items={items} />
        <div className="vault-callout active-vault-callout">
          <LockKeyhole />
          <span>EXPERIENCIA ACTIVA</span>
          <h2>THE VAULT</h2>
          <p>Demos autorizados, edits, mashups, versiones extendidas, sets privados y descargas limitadas desbloqueables con IAMJOSHWA Pass.</p>
          <Link className="button secondary" href="/the-vault">
            Entrar al Vault <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
