import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { bookingSchema } from "@/lib/validation/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { sendBookingEmails } from "@/lib/email/resend";

export async function POST(request:Request){
  try{
    if(!isSupabaseConfigured||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.FINGERPRINT_SALT)return NextResponse.json({error:"El servicio aún no está configurado."},{status:503});
    const parsed=bookingSchema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({error:"Revisa los campos enviados.",fields:parsed.error.flatten().fieldErrors},{status:400});
    const input=parsed.data;
    if(input.website)return NextResponse.json({ok:true});
    const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";
    const ipHash=createHash("sha256").update(`${process.env.FINGERPRINT_SALT}:${forwarded}`).digest("hex");
    const fingerprint=createHash("sha256").update(`${input.email.toLowerCase()}:${input.eventDate}:${input.project}`).digest("hex");
    const db=createAdminClient();
    const since=new Date(Date.now()-86400000).toISOString();
    const{count:recent}=await db.from("booking_requests").select("id",{count:"exact",head:true}).eq("ip_hash",ipHash).gte("created_at",since);
    if((recent||0)>=5)return NextResponse.json({error:"Se alcanzó el límite temporal de solicitudes. Intenta más tarde."},{status:429});
    const{data,error}=await db.from("booking_requests").insert({name:input.name,company:input.company,email:input.email,whatsapp:input.whatsapp||null,event_type:input.eventType,event_date:input.eventDate,event_time:input.eventTime||null,city:input.city,venue:input.venue||null,attendance:input.attendance||null,set_duration_minutes:input.setDuration||null,project:input.project,desired_genres:input.genres,budget_text:input.budget||null,equipment:input.equipment||null,production:input.production||null,message:input.message,contact_consent:true,fingerprint_hash:fingerprint,ip_hash:ipHash}).select("folio").single();
    if(error?.code==="23505")return NextResponse.json({error:"Ya existe una solicitud activa para esta fecha y proyecto."},{status:409});
    if(error)throw error;
    await sendBookingEmails({folio:data.folio,name:input.name,email:input.email,project:input.project,eventDate:input.eventDate,city:input.city});
    return NextResponse.json({ok:true,folio:data.folio},{status:201});
  }catch(error){
    console.error("booking_request_failed",error);
    return NextResponse.json({error:"No fue posible procesar la solicitud."},{status:500});
  }
}
