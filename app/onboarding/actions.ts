"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { onboardingSchema, profileFormData } from "@/lib/validation/profile";
import { sendWelcomeEmail } from "@/lib/email/resend";

export async function completeOnboarding(formData:FormData){
  const{supabase,user}=await requireRole(["fan","editor","admin"]);const parsed=onboardingSchema.safeParse(profileFormData(formData));if(!parsed.success)throw new Error("Revisa los datos del perfil");const input=parsed.data;
  const{error}=await supabase.from("profiles").update({display_name:input.name,public_alias:input.alias||null,city:input.city,country:input.country,favorite_project:input.project,favorite_genres:input.genres,onboarding_completed:true}).eq("id",user.id);if(error)throw error;
  const{error:prefError}=await supabase.from("notification_preferences").upsert({user_id:user.id,event_announcements:input.events,releases:input.releases,presaves:input.presaves,sets:input.sets,ticket_alerts:input.tickets,secret_events:input.secret,exclusive_content:input.exclusive,iamjoshwa:input.iamjoshwa,afterluv:input.afterluv,city_based:input.cityBased,preferred_channel:"email"});if(prefError)throw prefError;
  await supabase.from("notification_consents").insert({user_id:user.id,channel:"email",granted:input.communications,source:"onboarding"});
  await supabase.rpc("claim_profile_completion_points");
  if(input.communications&&user.email)try{await sendWelcomeEmail({userId:user.id,email:user.email,name:input.alias||input.name})}catch(error){console.error("welcome_email_failed",error)}
  redirect("/perfil");
}
