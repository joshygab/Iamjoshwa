import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { completeOnboarding } from "./actions";
import { OnboardingWizard } from "./onboarding-wizard";

const genres = ["House", "Tech House", "Afro House", "Latin House", "Disco", "Nu Disco", "Reguetón", "EDM", "Hard Techno", "Hard Trance", "Hard Bounce", "Euro Dance"];

export default async function OnboardingPage() {
  const { supabase, user } = await requireRole(["fan", "editor", "admin"]);
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.onboarding_completed) redirect("/perfil");

  return <OnboardingWizard action={completeOnboarding} genres={genres} profile={{ displayName: profile?.display_name || "", alias: profile?.public_alias || "" }} />;
}
