"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData:FormData){const email=String(formData.get("email")||"").trim().toLowerCase();const password=String(formData.get("password")||"");const next=String(formData.get("next")||"/perfil");if(!email||password.length<8)redirect(`/acceso?error=${encodeURIComponent("Correo o contraseña inválidos")}`);return{email,password,next:next.startsWith("/")?next:"/perfil"}}
export async function signInWithPassword(formData: FormData) {
  const {email,password,next}=getCredentials(formData); const supabase=await createClient();
  if(!supabase) redirect("/acceso?error=config");
  const {error}=await supabase.auth.signInWithPassword({email,password});
  redirect(error?`/acceso?error=${encodeURIComponent("No pudimos iniciar sesión. Revisa correo y contraseña.")}`:next);
}
export async function signUpWithPassword(formData: FormData) {
  const {email,password,next}=getCredentials(formData); const supabase=await createClient();
  if(!supabase) redirect("/acceso?error=config");
  const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"}/auth/callback`}});
  if(error)redirect(`/acceso?error=${encodeURIComponent(error.message)}`);
  const {error:loginError}=await supabase.auth.signInWithPassword({email,password});
  redirect(loginError?"/acceso?created=1":next);
}
export async function signOut(){const supabase=await createClient();await supabase?.auth.signOut();redirect("/");}
