import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ContentEditor } from "@/components/admin/content-editor";
import { restoreVersion } from "../../actions";
import { updateBookingStatus } from "../../module-actions";

const tables:Record<string,string>={eventos:"events",lanzamientos:"releases",sets:"sets",historia:"artist_timeline",epk:"epk_content",recompensas:"rewards",campanas:"campaigns",booking:"booking_requests"};

export default async function EditContent({params}:{params:Promise<{module:string;id:string}>}){
  const{module,id}=await params;const table=tables[module];if(!table)notFound();
  const{supabase,role}=await requireRole(["editor","admin"]);
  const[{data},{data:assets}]=await Promise.all([supabase.from(table).select("*").eq("id",id).maybeSingle(),supabase.from("media_assets").select("id,display_name,mime_type").eq("bucket","public-media").is("archived_at",null).order("display_name")]);
  if(!data)notFound();
  if(module==="booking")return <BookingDetail request={data}/>;
  if(module==="lanzamientos"){const{data:links}=await supabase.from("release_links").select("platform,url,position").eq("release_id",id).order("position");data.release_links=links||[]}
  if(module==="sets"){const{data:tracks}=await supabase.from("set_tracks").select("position,timestamp_seconds,artist,title,is_unreleased").eq("set_id",id).order("position");data.set_tracks=tracks||[]}
  const{data:versions}=role==="admin"?await supabase.from("content_versions").select("id,version,created_at").eq("entity_type",table).eq("entity_id",id).order("version",{ascending:false}).limit(20):{data:null};
  return <><header className="admin-header"><div><span className="section-kicker">EDITAR</span><h1>{data.name||data.title||data.section_key}</h1></div></header><ContentEditor module={module} initial={data} assets={assets||[]}/>{versions?.length?<section className="settings-card version-list"><span>VERSIONES</span>{versions.map(version=><form action={restoreVersion} key={version.id}><input type="hidden" name="versionId" value={version.id}/><p>Versión {version.version} · {new Date(version.created_at).toLocaleString("es-MX")}</p><button className="button secondary">Restaurar</button></form>)}</section>:null}</>;
}

function BookingDetail({request}:{request:Record<string,unknown>}){const fields=[["Folio",request.folio],["Nombre",request.name],["Empresa / promotor",request.company],["Correo",request.email],["WhatsApp",request.whatsapp],["Proyecto",request.project],["Tipo de evento",request.event_type],["Fecha",request.event_date],["Horario",request.event_time],["Ciudad",request.city],["Venue",request.venue],["Asistentes",request.attendance],["Duración",request.set_duration_minutes],["Géneros",Array.isArray(request.desired_genres)?request.desired_genres.join(", "):request.desired_genres],["Presupuesto",request.budget_text],["Equipo",request.equipment],["Producción",request.production],["Mensaje",request.message],["Consentimiento",request.contact_consent?"Sí":"No"]];return <><header className="admin-header"><div><span className="section-kicker">SOLICITUD DE BOOKING</span><h1>{String(request.folio)}</h1><p>Información privada. Utilízala únicamente para dar seguimiento a la contratación.</p></div></header><section className="settings-card booking-detail"><dl>{fields.map(([label,value])=>value!=null&&String(value)?<div key={String(label)}><dt>{String(label)}</dt><dd>{String(value)}</dd></div>:null)}</dl><form action={updateBookingStatus} className="inline-admin-form"><input type="hidden" name="id" value={String(request.id)}/><label>Estado<select name="status" defaultValue={String(request.status)}><option value="new">Nueva</option><option value="contacted">Contactado</option><option value="negotiating">En negociación</option><option value="confirmed">Confirmada</option><option value="rejected">Rechazada</option><option value="cancelled">Cancelada</option><option value="completed">Finalizada</option></select></label><button className="button primary">Actualizar seguimiento</button></form></section></>}
