import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminDashboard(){
  const{supabase}=await requireRole(["editor","admin"]);const now=new Date().toISOString();
  const[events,releases,newBooking,totalBooking,profiles,checkins,subscribers,media,drafts,schedules,profileCities]=await Promise.all([
    supabase.from("events").select("id,name,starts_at,event_status").gte("starts_at",now).not("event_status","in","(cancelled,completed)").order("starts_at").limit(1),
    supabase.from("releases").select("id,name,releases_at").gte("releases_at",now).order("releases_at").limit(1),
    supabase.from("booking_requests").select("id",{count:"exact",head:true}).eq("status","new"),
    supabase.from("booking_requests").select("id",{count:"exact",head:true}),
    supabase.from("profiles").select("id",{count:"exact",head:true}),
    supabase.from("event_checkins").select("id",{count:"exact",head:true}),
    supabase.from("current_notification_consents").select("id",{count:"exact",head:true}).eq("channel","email").eq("granted",true),
    supabase.from("media_assets").select("id",{count:"exact",head:true}).is("archived_at",null),
    supabase.from("page_sections").select("id",{count:"exact",head:true}).eq("publication_status","draft"),
    supabase.from("publication_schedule").select("id,error",{count:"exact"}).is("executed_at",null),
    supabase.from("profiles").select("city").not("city","is",null).limit(1000),
  ]);
  const cities=Object.entries((profileCities.data||[]).reduce<Record<string,number>>((acc,row)=>{const city=String(row.city||"").trim();if(city)acc[city]=(acc[city]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const alerts=(schedules.data||[]).filter(item=>item.error).length;
  return <><header className="admin-header"><div><span className="section-kicker">CONTROL CENTRAL</span><h1>Dashboard</h1><p>Estado editorial, solicitudes y comunidad en un solo lugar.</p></div><span>Actualiza al recargar</span></header><section className="admin-stats"><article><span>REGISTROS</span><strong>{profiles.count||0}</strong></article><article><span>SUSCRIPTORES</span><strong>{subscribers.count||0}</strong></article><article><span>BOOKING NUEVO</span><strong>{newBooking.count||0}</strong></article><article><span>CHECK-INS</span><strong>{checkins.count||0}</strong></article><article><span>ARCHIVOS</span><strong>{media.count||0}</strong></article><article><span>BORRADORES HOME</span><strong>{drafts.count||0}</strong></article><article><span>PROGRAMADOS</span><strong>{schedules.count||0}</strong></article><article><span>ALERTAS</span><strong>{alerts}</strong></article></section><section className="admin-panels"><article><span>PRÓXIMO EVENTO</span><h2>{events.data?.[0]?.name||"Sin evento programado"}</h2><p>{events.data?.[0]?.starts_at?new Date(events.data[0].starts_at).toLocaleString("es-MX"):"Crea el siguiente evento desde el CMS."}</p><Link className="text-link" href="/admin/eventos">Administrar eventos</Link></article><article><span>PRÓXIMO LANZAMIENTO</span><h2>{releases.data?.[0]?.name||"Sin lanzamiento programado"}</h2><p>{releases.data?.[0]?.releases_at?new Date(releases.data[0].releases_at).toLocaleString("es-MX"):"Programa música desde Lanzamientos."}</p><Link className="text-link" href="/admin/lanzamientos">Administrar lanzamientos</Link></article><article><span>BOOKING</span><h2>{totalBooking.count||0} solicitudes</h2><p>{newBooking.count||0} requieren revisión inicial.</p><Link className="text-link" href="/admin/booking">Abrir seguimiento</Link></article><article><span>CIUDADES PRINCIPALES</span>{cities.length?cities.map(([city,count])=><p key={city}>{city} · {count}</p>):<p>Se mostrarán después del onboarding de los fans.</p>}</article></section></>;
}
