import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get("code");const requested=url.searchParams.get("next")||"/perfil";const next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/perfil";if(code){const supabase=await createClient();const{error}=await supabase?.auth.exchangeCodeForSession(code)??{error:new Error("Supabase no configurado")};if(error)return NextResponse.redirect(new URL("/acceso?error=callback",url.origin));const{data:{user}}=await supabase?.auth.getUser()??{data:{user:null}};const cookieStore=await cookies();const referralCode=cookieStore.get("iamjoshwa_ref")?.value;if(user&&referralCode){await supabase?.rpc("claim_referral",{p_code:referralCode});cookieStore.delete("iamjoshwa_ref")}}return NextResponse.redirect(new URL(next,url.origin))}
