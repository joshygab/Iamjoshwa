import { PageHero } from "@/components/page-hero";
import { VaultExperience } from "@/components/vault-experience";
import { contentRepository } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo";

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
  const [rewards, sets, points] = await Promise.all([
    contentRepository.getRewards(),
    contentRepository.getSets(),
    db && user ? db.from("fan_point_totals").select("points").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHero kicker="THE VAULT" title="El archivo privado de la señal." description="Drops limitados, demos autorizados, edits, mashups, versiones extendidas y sets privados desbloqueables con IAMJOSHWA Pass." />
      <section className="section vault-section">
        <VaultExperience rewards={rewards} sets={sets} balance={points.data?.points ?? null} signedIn={Boolean(user)} />
      </section>
    </>
  );
}
