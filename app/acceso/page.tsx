import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { signInWithPassword, signUpWithPassword } from "@/app/auth/actions";

export const metadata={title:"Acceso"};

export default async function AccessPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const query=await searchParams;
  const next=query.next&&query.next.startsWith("/")?query.next:"/perfil";
  const supabase=await createClient();const{data:{user}}=await supabase?.auth.getUser()??{data:{user:null}};if(user)redirect(next);
  return <section className="auth-page"><div className="auth-card"><span className="demo-chip">IAMJOSHWA PASS</span><h1>Entra al círculo.</h1><p>Usa tu correo y contraseña para entrar a IAMJOSHWA y AFTERLUV con una sola cuenta.</p>{!isSupabaseConfigured&&<div className="config-alert">Falta configurar Supabase.</div>}{query.created&&<div className="success-alert">Cuenta creada. Ahora inicia sesión con tu contraseña.</div>}{query.error&&<div className="error-alert">{decodeURIComponent(query.error)}</div>}<form action={signInWithPassword} className="auth-form"><input type="hidden" name="next" value={next}/><label>Correo<input type="email" name="email" required autoComplete="email" inputMode="email" placeholder="nombre@correo.com"/></label><label>Contraseña<input type="password" name="password" required minLength={8} autoComplete="current-password"/></label><button className="button primary" disabled={!isSupabaseConfigured}>Entrar</button><button className="button secondary" formAction={signUpWithPassword} disabled={!isSupabaseConfigured}>Crear cuenta</button></form><small>La contraseña debe tener mínimo 8 caracteres.</small></div></section>;
}
