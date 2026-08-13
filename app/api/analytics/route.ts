import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

const schema = z.object({
  action: z.string().trim().min(2).max(80),
  entityType: z.string().trim().min(2).max(80).optional(),
  entityId: z.string().trim().max(120).optional(),
  label: z.string().trim().max(160).optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const db = createAdminClient();
    await db.from("audit_logs").insert({
      action: `public_${parsed.data.action}`,
      entity_type: parsed.data.entityType || "public_interaction",
      entity_id: parsed.data.entityId || null,
      new_values: { label: parsed.data.label || null, url: parsed.data.url || null, metadata: parsed.data.metadata || null, at: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
