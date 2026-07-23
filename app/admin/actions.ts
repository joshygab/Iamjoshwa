"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

const projects = new Set(["iamjoshwa", "afterluv"]);
const hex = /^#[0-9a-f]{6}$/i;
const safeHref = (value: string) => value.startsWith("/") || /^https:\/\//i.test(value);
function projectOf(data: FormData) { const value = String(data.get("project")); if (!projects.has(value)) throw new Error("Proyecto inválido"); return value; }
async function audit(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], userId: string, action: string, type: string, id: string, oldValues: unknown, newValues: unknown) { await supabase.from("audit_logs").insert({ actor_id: userId, action, entity_type: type, entity_id: id, old_values: oldValues, new_values: newValues }); }

export async function saveBrandSettings(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]); const project = projectOf(formData);
  const mediaFields = { logo_asset_id: optionalUuid(formData.get("logoAssetId")), alternate_logo_asset_id: optionalUuid(formData.get("alternateLogoAssetId")), hero_desktop_asset_id: optionalUuid(formData.get("heroDesktopAssetId")), hero_mobile_asset_id: optionalUuid(formData.get("heroMobileAssetId")) };
  const selectedAssets = Object.values(mediaFields).filter((value): value is string => Boolean(value));
  if (selectedAssets.length) { const { data: assets, error: assetError } = await supabase.from("media_assets").select("id,mime_type,bucket,archived_at").in("id", selectedAssets); if (assetError || assets?.length !== new Set(selectedAssets).size || assets.some((asset) => asset.bucket !== "public-media" || asset.archived_at || !asset.mime_type.startsWith("image/"))) throw new Error("Selecciona únicamente imágenes públicas activas de la biblioteca"); }
  const profile = { project, display_name: String(formData.get("displayName") || "").trim(), tagline: String(formData.get("tagline") || "").trim() || null, subtitle: String(formData.get("subtitle") || "").trim() || null, base_city: String(formData.get("baseCity") || "").trim() || null, short_bio: String(formData.get("shortBio") || "").trim() || null, long_bio: String(formData.get("longBio") || "").trim() || null, genres: String(formData.get("genres") || "").split(",").map((x) => x.trim()).filter(Boolean), booking_email: String(formData.get("bookingEmail") || "").trim() || null, status: String(formData.get("status")) === "published" ? "published" : "draft", ...mediaFields, updated_at: new Date().toISOString() };
  if (!profile.display_name) throw new Error("El nombre es obligatorio");
  const colors = ["primary", "secondary", "accent", "background", "text"].map((key) => String(formData.get(key) || ""));
  if (!colors.every((color) => hex.test(color))) throw new Error("Los colores deben usar formato hexadecimal");
  if (contrast(colors[3], colors[4]) < 4.5) throw new Error("El contraste entre fondo y texto debe ser al menos 4.5:1");
  const brand = { project, primary_color: colors[0], secondary_color: colors[1], accent_color: colors[2], background_color: colors[3], text_color: colors[4], gradient_css: `linear-gradient(135deg,${colors[0]},${colors[1]})`, animation_intensity: Number(formData.get("animationIntensity") || 1), updated_at: new Date().toISOString() };
  const { data: old } = await supabase.from("artist_profiles").select("*").eq("project", project).maybeSingle();
  const { data, error } = await supabase.from("artist_profiles").upsert(profile, { onConflict: "project" }).select("id").single(); if (error) throw error;
  const { error: brandError } = await supabase.from("brand_settings").upsert(brand, { onConflict: "project" }); if (brandError) throw brandError;
  await supabase.from("media_usage").delete().eq("entity_type", "artist_profiles").eq("entity_id", data.id);
  const usage = Object.entries(mediaFields).flatMap(([field_name, asset_id]) => asset_id ? [{ asset_id, entity_type: "artist_profiles", entity_id: data.id, field_name }] : []);
  if (usage.length) { const { error: usageError } = await supabase.from("media_usage").insert(usage); if (usageError) throw usageError; }
  await audit(supabase, user.id, old ? "update" : "create", "artist_profiles", data.id, old, profile);
  revalidatePath("/admin/configuracion"); revalidatePath("/", "layout");
}

export async function savePageSection(formData: FormData) {
  const { supabase, user, canPublish } = await requireRole(["editor", "admin"]); const status = String(formData.get("status") || "draft");
  if (["published","scheduled"].includes(status) && !canPublish) throw new Error("No tienes permiso para publicar");
  const id = String(formData.get("id") || ""); const mediaAssetId = optionalUuid(formData.get("mediaAssetId")); const content = { title: String(formData.get("title") || ""), subtitle: String(formData.get("subtitle") || ""), body: String(formData.get("body") || ""), cta_label: String(formData.get("ctaLabel") || ""), cta_href: String(formData.get("ctaHref") || ""), media_asset_id: mediaAssetId };
  if (content.cta_href && !safeHref(content.cta_href)) throw new Error("Enlace CTA inválido");
  if (mediaAssetId) { const { data: asset } = await supabase.from("media_assets").select("id,mime_type,bucket,archived_at").eq("id",mediaAssetId).maybeSingle(); if (!asset || asset.bucket!=="public-media" || asset.archived_at || (!asset.mime_type.startsWith("image/")&&!asset.mime_type.startsWith("video/"))) throw new Error("Recurso multimedia inválido"); }
  const publishAt = String(formData.get("publishAt")||""); if(status==="scheduled"&&(!publishAt||Number.isNaN(new Date(publishAt).getTime())))throw new Error("Selecciona una fecha válida para programar");
  const payload = { page_key: "home", project: projectOf(formData), block_type: String(formData.get("blockType")), variant: String(formData.get("variant") || "default"), content, position: Number(formData.get("position") || 0), publication_status: status==="scheduled"?"draft":status, updated_by: user.id, published_at: status === "published" ? new Date().toISOString() : null };
  const { data: old } = id ? await supabase.from("page_sections").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("page_sections").update(payload).eq("id", id) : supabase.from("page_sections").insert({ ...payload, created_by: user.id });
  const { data, error } = await query.select("id").single(); if (error) throw error; await audit(supabase, user.id, id ? "update" : "create", "page_sections", data.id, old, payload);
  await supabase.from("publication_schedule").delete().eq("entity_type","page_sections").eq("entity_id",data.id).is("executed_at",null);
  if(status==="scheduled")await supabase.from("publication_schedule").insert({entity_type:"page_sections",entity_id:data.id,action:"publish",execute_at:new Date(publishAt).toISOString(),created_by:user.id});
  revalidatePath("/admin/portada"); revalidatePath("/");
}

export async function archivePageSection(formData: FormData) { const { supabase, user } = await requireRole(["editor", "admin"]); const id = String(formData.get("id")); const { data: old } = await supabase.from("page_sections").select("*").eq("id", id).single(); await supabase.from("page_sections").update({ publication_status: "archived", updated_by: user.id }).eq("id", id); await audit(supabase, user.id, "archive", "page_sections", id, old, { publication_status: "archived" }); revalidatePath("/admin/portada"); revalidatePath("/"); }

export async function saveNavigation(formData: FormData) { const { supabase, user } = await requireRole(["admin"]); const href = String(formData.get("href") || ""); if (!safeHref(href)) throw new Error("Enlace inválido"); const payload = { label: String(formData.get("label") || "").trim(), href, position: Number(formData.get("position") || 0), visible: formData.get("visible") === "on", project: formData.get("project") || null }; const { data, error } = await supabase.from("navigation_items").insert(payload).select("id").single(); if (error) throw error; await audit(supabase, user.id, "create", "navigation_items", data.id, null, payload); revalidatePath("/", "layout"); revalidatePath("/admin/configuracion"); }
export async function saveSocialLink(formData: FormData) { const { supabase, user } = await requireRole(["admin"]); const url = String(formData.get("url") || ""); if (!/^https:\/\//i.test(url)) throw new Error("URL inválida"); const payload = { platform: String(formData.get("platform") || "other"), label: String(formData.get("label") || ""), url, position: Number(formData.get("position") || 0), active: formData.get("active") === "on", project: formData.get("project") || null }; const { data, error } = await supabase.from("social_links").insert(payload).select("id").single(); if (error) throw error; await audit(supabase, user.id, "create", "social_links", data.id, null, payload); revalidatePath("/", "layout"); revalidatePath("/admin/configuracion"); }
export async function restoreVersion(formData: FormData) { const { supabase } = await requireRole(["admin"]); const { error } = await supabase.rpc("restore_content_version", { p_version_id: String(formData.get("versionId")) }); if (error) throw error; revalidatePath("/admin", "layout"); revalidatePath("/", "layout"); }

export async function saveSeo(formData: FormData) { const { supabase, user } = await requireRole(["editor", "admin"]); const path = String(formData.get("path") || ""); if (!/^\/[a-z0-9\-/]*$/i.test(path)) throw new Error("La ruta no es válida"); const canonical = String(formData.get("canonical") || ""); if (canonical && !/^https:\/\//i.test(canonical)) throw new Error("Canonical inválida"); const shareAssetId=optionalUuid(formData.get("shareAssetId"));if(shareAssetId){const{data:asset}=await supabase.from("media_assets").select("id,mime_type,bucket,archived_at").eq("id",shareAssetId).maybeSingle();if(!asset||asset.bucket!=="public-media"||asset.archived_at||!asset.mime_type.startsWith("image/"))throw new Error("Imagen social inválida")} const payload = { path, title: String(formData.get("title") || "").slice(0,65) || null, description: String(formData.get("description") || "").slice(0,170) || null, share_asset_id:shareAssetId, canonical_url: canonical || null, indexable: formData.get("indexable") === "on" }; const { data, error } = await supabase.from("seo_metadata").upsert(payload, { onConflict: "path" }).select("id").single(); if (error) throw error; await audit(supabase, user.id, "upsert", "seo_metadata", data.id, null, payload); revalidatePath("/admin/seo"); revalidatePath(path); }

function contrast(a: string, b: string) { const luminance = (color: string) => { const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }; const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (bright + .05) / (dark + .05); }
function optionalUuid(value: FormDataEntryValue | null) { const candidate = String(value || ""); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null; }
