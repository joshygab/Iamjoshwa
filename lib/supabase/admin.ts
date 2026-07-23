import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !key) throw new Error("Credenciales privadas de Supabase no configuradas");
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession:false, autoRefreshToken:false } });
}
