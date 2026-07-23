"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export async function unsubscribeEmail(data:FormData){const token=String(data.get("token")||"");const verified=verifyUnsubscribeToken(token);if(!verified)redirect("/notificaciones/baja?error=invalid");const db=createAdminClient();const{error}=await db.from("notification_consents").insert({user_id:verified.userId,channel:"email",granted:false,source:"unsubscribe_link"});if(error)throw error;redirect("/notificaciones/baja?done=1")}
