"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithOtp(formData: FormData) {
  const email=String(formData.get("email")||"").trim(); const supabase=await createClient();
  if(!supabase) redirect("/acceso?error=config");
  const origin=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${origin}/auth/callback`}});
  redirect(error?`/acceso?error=${encodeURIComponent(error.message)}`:"/acceso?sent=1");
}
export async function signOut(){const supabase=await createClient();await supabase?.auth.signOut();redirect("/");}
