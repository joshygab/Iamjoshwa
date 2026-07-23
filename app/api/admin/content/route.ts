import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeAdminValues, type AdminModule } from "@/lib/validation/admin-content";

const tables: Record<AdminModule, string> = { eventos: "events", lanzamientos: "releases", sets: "sets", historia: "artist_timeline", epk: "epk_content", recompensas: "rewards", campanas: "campaigns" };

async function authorize() {
  const db = await createClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: roles } = await db.from("user_roles").select("role,can_publish").eq("user_id", user.id);
  if (!roles?.some((item) => item.role === "editor" || item.role === "admin")) return null;
  return { db, user, canPublish: roles.some((item) => item.role === "admin" || item.can_publish) };
}

async function save(request: Request) {
  const auth = await authorize();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await request.json();
  if (!(body.module in tables)) return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  const contentModule = body.module as AdminModule;
  const parsed = normalizeAdminValues(contentModule, body.values || {});
  if (!parsed.success) return NextResponse.json({ error: "Revisa los campos", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const payload = { ...parsed.data } as Record<string, unknown>;
  const releaseLinks = contentModule === "lanzamientos" ? payload.release_links as Record<string, unknown>[] : undefined;
  const setTracks = contentModule === "sets" ? payload.set_tracks as Record<string, unknown>[] : undefined;
  delete payload.release_links;
  delete payload.set_tracks;
  const publishAt = "publish_at" in parsed.data ? parsed.data.publish_at : undefined;
  const requestedStatus = String(payload.publication_status || payload.status || "draft");
  if (["published", "scheduled"].includes(requestedStatus) && !auth.canPublish) return NextResponse.json({ error: "No tienes permiso para publicar o programar." }, { status: 403 });
  const table = tables[contentModule];
  const { data: old } = body.id ? await auth.db.from(table).select("*").eq("id", body.id).maybeSingle() : { data: null };
  if (body.id && !old) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (contentModule !== "campanas") {
    delete payload.publish_at;
    if (requestedStatus === "scheduled") payload.publication_status = "draft";
  }
  const createdByTables = new Set(["events", "releases", "sets", "campaigns"]);
  const insertPayload = createdByTables.has(table) ? { ...payload, created_by: auth.user.id } : payload;
  const query = body.id ? auth.db.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq("id", body.id) : auth.db.from(table).insert(insertPayload);
  const { data, error } = await query.select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (releaseLinks) {
    const { error: removeError } = await auth.db.from("release_links").delete().eq("release_id", data.id);
    if (removeError) return NextResponse.json({ error: removeError.message }, { status: 400 });
    if (releaseLinks.length) { const { error: linksError } = await auth.db.from("release_links").insert(releaseLinks.map((link) => ({ ...link, release_id: data.id }))); if (linksError) return NextResponse.json({ error: linksError.message }, { status: 400 }); }
  }
  if (setTracks) {
    const { error: removeError } = await auth.db.from("set_tracks").delete().eq("set_id", data.id);
    if (removeError) return NextResponse.json({ error: removeError.message }, { status: 400 });
    if (setTracks.length) { const { error: tracksError } = await auth.db.from("set_tracks").insert(setTracks.map((track) => ({ ...track, set_id: data.id }))); if (tracksError) return NextResponse.json({ error: tracksError.message }, { status: 400 }); }
  }
  if (contentModule !== "campanas" && requestedStatus === "scheduled" && publishAt) await auth.db.from("publication_schedule").insert({ entity_type: table, entity_id: data.id, action: "publish", execute_at: publishAt, created_by: auth.user.id });
  await auth.db.from("audit_logs").insert({ actor_id: auth.user.id, action: body.id ? "update" : "create", entity_type: table, entity_id: data.id, old_values: old, new_values: payload });
  for (const path of affectedPaths(contentModule)) revalidatePath(path);
  return NextResponse.json({ ok: true, id: data.id });
}

export const POST = save;
export const PATCH = save;

export async function DELETE(request: Request) {
  const auth = await authorize();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await request.json();
  if (!(body.module in tables)) return NextResponse.json({ error: "Módulo inválido" }, { status: 400 });
  const table = tables[body.module as AdminModule];
  const { data: old } = await auth.db.from(table).select("*").eq("id", body.id).single();
  if (!old) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const statusField = body.module === "campanas" ? "status" : "publication_status";
  const archived = body.module === "campanas" ? "cancelled" : "archived";
  const { error } = await auth.db.from(table).update({ [statusField]: archived, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await auth.db.from("audit_logs").insert({ actor_id: auth.user.id, action: "archive", entity_type: table, entity_id: body.id, old_values: old, new_values: { [statusField]: archived } });
  for (const path of affectedPaths(body.module as AdminModule)) revalidatePath(path);
  return NextResponse.json({ ok: true });
}

function affectedPaths(module: AdminModule) { const map: Partial<Record<AdminModule, string[]>> = { eventos: ["/", "/fechas"], lanzamientos: ["/", "/lanzamientos"], sets: ["/", "/musica"], historia: ["/historia"], epk: ["/epk"] }; return map[module] || []; }
