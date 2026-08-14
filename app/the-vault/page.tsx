import { PageHero } from "@/components/page-hero";
import { SectionUnavailable } from "@/components/section-unavailable";
import { VaultExperience } from "@/components/vault-experience";
import { createLabelGetter, systemEnabled, systemMessage } from "@/lib/cms/labels";
import { contentRepository } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo";

const requestTime = Date.now();

export const generateMetadata = () => pageMetadata({
  path: "/the-vault",
  title: "The Vault",
  description: "Demos, edits, mashups, sets privados y drops limitados de IAMJOSHWA / AFTERLUV.",
});

export default async function VaultPage() {
  const db = await createClient();
  const {
    data: { user },
  } = db ? await db.auth.getUser() : { data: { user: null } };
  const [rewards, sets, points, labels, settings, section] = await Promise.all([
    contentRepository.getRewards(),
    contentRepository.getSets(),
    db && user ? db.from("fan_point_totals").select("points").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    contentRepository.getLabels(),
    contentRepository.getPublicSettings(),
    contentRepository.getPublicSection("vault"),
  ]);
  const label = createLabelGetter(labels);
  const disabled = systemEnabled(settings, "disable_public_vault");

  return (
    <>
      {section === null ? <SectionUnavailable title={label("vault.hidden", "VAULT SEALED")} body={label("vault.empty", "The Vault is temporarily sealed.")} /> : null}
      {section === null ? null : (
      <>
      <PageHero kicker={label("nav.vault", "THE VAULT")} title={disabled ? "VAULT SEALED" : label("vault.title", "El archivo privado de la señal.")} description={disabled ? systemMessage(settings, "disable_public_vault", "The Vault is temporarily sealed.") : label("vault.subtitle", "Drops limitados, demos autorizados, edits, mashups, versiones extendidas y sets privados desbloqueables con IAMJOSHWA Pass.")} />
      <section className="section vault-section">
        {disabled ? <div className="admin-empty public-empty branded-empty"><span>ACCESS LOCKED</span><h2>{systemMessage(settings, "disable_public_vault", "The Vault is temporarily sealed.")}</h2><p>Vuelve cuando la señal se reactive desde el Control Room.</p></div> : <VaultExperience rewards={rewards} sets={sets} balance={points.data?.points ?? null} signedIn={Boolean(user)} now={requestTime} />}
      </section>
      </>
      )}
    </>
  );
}
