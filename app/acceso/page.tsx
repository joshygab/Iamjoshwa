import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { signInWithOtp } from "@/app/auth/actions";

export const metadata={title:"Acceso"};

export default async function AccessPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const supabase=await createClient();const{data:{user}}=await supabase?.auth.getUser()??{data:{user:null}};if(user)redirect("/perfil");
  const query=await searchParams;
  return <section className="auth-page"><div className="auth-card"><span className="demo-chip">IAMJOSHWA PASS</span><h1>Entra al círculo.</h1><p>Usa tu correo de Gmail para entrar a IAMJOSHWA y AFTERLUV con una sola cuenta.</p>{!isSupabaseConfigured&&<div className="config-alert">Falta configurar Supabase.</div>}{query.sent&&<div className="success-alert">Revisa Gmail. Te enviamos un enlace para continuar.</div>}{query.error&&<div className="error-alert">No fue posible enviar el acceso. Revisa el correo e inténtalo nuevamente.</div>}<form action={signInWithOtp} className="auth-form"><label>Correo de Gmail<input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="nombre@gmail.com"/></label><button className="button primary" disabled={!isSupabaseConfigured}>Enviar enlace de acceso</button></form><small>No necesitas crear ni recordar una contraseña.</small></div></section>;
}
