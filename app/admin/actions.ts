"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { supabase, user } = await requireRole(["editor", "admin"]); const status = String(formData.get("status") || "draft");
  const writeDb = createAdminClient();
  const id = String(formData.get("id") || ""); const mediaAssetId = optionalUuid(formData.get("mediaAssetId")); const content = { title: String(formData.get("title") || ""), subtitle: String(formData.get("subtitle") || ""), body: String(formData.get("body") || ""), cta_label: String(formData.get("ctaLabel") || ""), cta_href: String(formData.get("ctaHref") || ""), media_asset_id: mediaAssetId };
  if (content.cta_href && !safeHref(content.cta_href)) throw new Error("Enlace CTA inválido");
  if (mediaAssetId) { const { data: asset } = await supabase.from("media_assets").select("id,mime_type,bucket,archived_at").eq("id",mediaAssetId).maybeSingle(); if (!asset || asset.bucket!=="public-media" || asset.archived_at || (!asset.mime_type.startsWith("image/")&&!asset.mime_type.startsWith("video/"))) throw new Error("Recurso multimedia inválido"); }
  const publishAt = String(formData.get("publishAt")||""); if(status==="scheduled"&&(!publishAt||Number.isNaN(new Date(publishAt).getTime())))throw new Error("Selecciona una fecha válida para programar");
  const payload = { page_key: "home", project: projectOf(formData), block_type: String(formData.get("blockType")), variant: String(formData.get("variant") || "default"), content, position: Number(formData.get("position") || 0), publication_status: status==="scheduled"?"draft":status, updated_by: user.id, published_at: status === "published" ? new Date().toISOString() : null };
  const { data: old } = id ? await supabase.from("page_sections").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? writeDb.from("page_sections").update(payload).eq("id", id) : writeDb.from("page_sections").insert({ ...payload, created_by: user.id });
  const { data, error } = await query.select("id").single(); if (error) throw error; await audit(supabase, user.id, id ? "update" : "create", "page_sections", data.id, old, payload);
  await writeDb.from("publication_schedule").delete().eq("entity_type","page_sections").eq("entity_id",data.id).is("executed_at",null);
  if(status==="scheduled")await writeDb.from("publication_schedule").insert({entity_type:"page_sections",entity_id:data.id,action:"publish",execute_at:new Date(publishAt).toISOString(),created_by:user.id});
  revalidatePath("/admin/portada"); revalidatePath("/");
}

export async function archivePageSection(formData: FormData) { const { supabase, user } = await requireRole(["editor", "admin"]); const id = String(formData.get("id")); const { data: old } = await supabase.from("page_sections").select("*").eq("id", id).single(); await supabase.from("page_sections").update({ publication_status: "archived", updated_by: user.id }).eq("id", id); await audit(supabase, user.id, "archive", "page_sections", id, old, { publication_status: "archived" }); revalidatePath("/admin/portada"); revalidatePath("/"); }

export async function saveNavigation(formData: FormData) { const { supabase, user } = await requireRole(["admin"]); const href = String(formData.get("href") || ""); if (!safeHref(href)) throw new Error("Enlace inválido"); const payload = { label: String(formData.get("label") || "").trim(), href, position: Number(formData.get("position") || 0), visible: formData.get("visible") === "on", project: formData.get("project") || null }; const { data, error } = await supabase.from("navigation_items").insert(payload).select("id").single(); if (error) throw error; await audit(supabase, user.id, "create", "navigation_items", data.id, null, payload); revalidatePath("/", "layout"); revalidatePath("/admin/configuracion"); }
export async function saveSocialLink(formData: FormData) { const { supabase, user } = await requireRole(["admin"]); const id = String(formData.get("id") || ""); const url = String(formData.get("url") || ""); if (!/^https:\/\//i.test(url)) throw new Error("URL inválida"); const payload = { platform: String(formData.get("platform") || "other").toLowerCase().trim(), label: String(formData.get("label") || "").trim(), url, position: Number(formData.get("position") || 0), active: formData.get("active") === "on", project: formData.get("project") || null }; if (!payload.label) throw new Error("La etiqueta es obligatoria"); const { data: old } = id ? await supabase.from("social_links").select("*").eq("id", id).maybeSingle() : { data: null }; const query = id ? supabase.from("social_links").update(payload).eq("id", id) : supabase.from("social_links").insert(payload); const { data, error } = await query.select("id").single(); if (error) throw error; await audit(supabase, user.id, id ? "update" : "create", "social_links", data.id, old, payload); revalidatePath("/", "layout"); revalidatePath("/admin/configuracion"); revalidatePath("/admin/redes-sociales"); }
export async function deleteSocialLink(formData: FormData) { const { supabase, user } = await requireRole(["admin"]); const id = String(formData.get("id") || ""); const { data: old } = await supabase.from("social_links").select("*").eq("id", id).maybeSingle(); if (!old) throw new Error("Red no encontrada"); const { error } = await supabase.from("social_links").delete().eq("id", id); if (error) throw error; await audit(supabase, user.id, "delete", "social_links", id, old, null); revalidatePath("/", "layout"); revalidatePath("/admin/configuracion"); revalidatePath("/admin/redes-sociales"); }
export async function restoreVersion(formData: FormData) { const { supabase } = await requireRole(["admin"]); const { error } = await supabase.rpc("restore_content_version", { p_version_id: String(formData.get("versionId")) }); if (error) throw error; revalidatePath("/admin", "layout"); revalidatePath("/", "layout"); }

export async function saveSeo(formData: FormData) { const { supabase, user } = await requireRole(["editor", "admin"]); const path = String(formData.get("path") || ""); if (!/^\/[a-z0-9\-/]*$/i.test(path)) throw new Error("La ruta no es válida"); const canonical = String(formData.get("canonical") || ""); if (canonical && !/^https:\/\//i.test(canonical)) throw new Error("Canonical inválida"); const shareAssetId=optionalUuid(formData.get("shareAssetId"));if(shareAssetId){const{data:asset}=await supabase.from("media_assets").select("id,mime_type,bucket,archived_at").eq("id",shareAssetId).maybeSingle();if(!asset||asset.bucket!=="public-media"||asset.archived_at||!asset.mime_type.startsWith("image/"))throw new Error("Imagen social inválida")} const payload = { path, title: String(formData.get("title") || "").slice(0,65) || null, description: String(formData.get("description") || "").slice(0,170) || null, share_asset_id:shareAssetId, canonical_url: canonical || null, indexable: formData.get("indexable") === "on" }; const { data, error } = await supabase.from("seo_metadata").upsert(payload, { onConflict: "path" }).select("id").single(); if (error) throw error; await audit(supabase, user.id, "upsert", "seo_metadata", data.id, null, payload); revalidatePath("/admin/seo"); revalidatePath(path); }

export async function saveSiteSection(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const id = String(formData.get("id") || "");
  const payload = {
    section_key: key(String(formData.get("sectionKey") || "")),
    internal_name: String(formData.get("internalName") || "").trim(),
    public_name: String(formData.get("publicName") || "").trim(),
    slug: slug(String(formData.get("slug") || "")),
    project: formData.get("project") || null,
    status: status(String(formData.get("status") || "draft"), ["draft", "published", "hidden", "coming_soon", "members_only", "scheduled", "archived"]),
    show_in_navbar: formData.get("showInNavbar") === "on",
    show_in_footer: formData.get("showInFooter") === "on",
    show_on_home: formData.get("showOnHome") === "on",
    show_in_sitemap: formData.get("showInSitemap") === "on",
    requires_auth: formData.get("requiresAuth") === "on",
    requires_pass: formData.get("requiresPass") === "on",
    min_pass_level: optionalInt(formData.get("minPassLevel")),
    publish_at: optionalDate(formData.get("publishAt")),
    unpublish_at: optionalDate(formData.get("unpublishAt")),
    position: Number(formData.get("position") || 0),
    icon: String(formData.get("icon") || "").trim() || null,
    badge: String(formData.get("badge") || "").trim() || null,
    cta_label: String(formData.get("ctaLabel") || "").trim() || null,
    cta_href: optionalHref(formData.get("ctaHref")),
    seo_title: String(formData.get("seoTitle") || "").slice(0, 70) || null,
    seo_description: String(formData.get("seoDescription") || "").slice(0, 180) || null,
    indexable: formData.get("indexable") === "on",
    updated_by: user.id,
  };
  if (!payload.internal_name || !payload.public_name) throw new Error("Nombre interno y público son obligatorios");
  const { data: old } = id ? await supabase.from("site_sections").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("site_sections").update(payload).eq("id", id) : supabase.from("site_sections").insert({ ...payload, created_by: user.id });
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await audit(supabase, user.id, id ? "update" : "create", "site_sections", data.id, old, payload);
  await revision(supabase, user.id, "site_sections", data.id, payload.section_key, old, payload);
  revalidatePath("/admin/sections"); revalidatePath("/", "layout");
}

export async function archiveSiteSection(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const id = String(formData.get("id") || "");
  const { data: old } = await supabase.from("site_sections").select("*").eq("id", id).maybeSingle();
  if (!old) throw new Error("Sección no encontrada");
  const { error } = await supabase.from("site_sections").update({ status: "archived", updated_by: user.id }).eq("id", id); if (error) throw error;
  await audit(supabase, user.id, "archive", "site_sections", id, old, { status: "archived" });
  revalidatePath("/admin/sections"); revalidatePath("/", "layout");
}

export async function saveNavigationItem(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const id = String(formData.get("id") || "");
  const href = optionalHref(formData.get("href"));
  if (!href) throw new Error("URL inválida");
  const payload = {
    section_id: optionalUuid(formData.get("sectionId")),
    label: String(formData.get("label") || "").trim(),
    href,
    position: Number(formData.get("position") || 0),
    visible: formData.get("visible") === "on",
    project: formData.get("project") || null,
    target: String(formData.get("target") || "_self") === "_blank" ? "_blank" : "_self",
    icon: String(formData.get("icon") || "").trim() || null,
    badge: String(formData.get("badge") || "").trim() || null,
    show_in_navbar: formData.get("showInNavbar") === "on",
    show_in_footer: formData.get("showInFooter") === "on",
    show_on_desktop: formData.get("showOnDesktop") === "on",
    show_on_mobile: formData.get("showOnMobile") === "on",
    status: status(String(formData.get("status") || "published"), ["draft", "published", "hidden", "coming_soon", "members_only", "scheduled", "archived"]),
    publish_at: optionalDate(formData.get("publishAt")),
    unpublish_at: optionalDate(formData.get("unpublishAt")),
  };
  if (!payload.label) throw new Error("La etiqueta es obligatoria");
  const { data: old } = id ? await supabase.from("navigation_items").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("navigation_items").update(payload).eq("id", id) : supabase.from("navigation_items").insert(payload);
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await audit(supabase, user.id, id ? "update" : "create", "navigation_items", data.id, old, payload);
  revalidatePath("/admin/navigation"); revalidatePath("/", "layout");
}

export async function saveContentLabel(formData: FormData) {
  const { supabase, user } = await requireRole(["editor", "admin"]);
  const id = String(formData.get("id") || "");
  const payload = {
    label_key: key(String(formData.get("labelKey") || "")),
    group_key: key(String(formData.get("groupKey") || "global")),
    default_value: String(formData.get("defaultValue") || ""),
    current_value: String(formData.get("currentValue") || "") || null,
    description: String(formData.get("description") || "").trim() || null,
    status: status(String(formData.get("status") || "published"), ["draft", "published", "hidden", "archived"]),
    updated_by: user.id,
  };
  if (!payload.default_value) throw new Error("El valor default es obligatorio");
  const { data: old } = id ? await supabase.from("content_labels").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("content_labels").update(payload).eq("id", id) : supabase.from("content_labels").insert(payload);
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await audit(supabase, user.id, id ? "update_label" : "create_label", "content_labels", data.id, old, payload);
  await revision(supabase, user.id, "content_labels", data.id, payload.label_key, old?.current_value ?? old?.default_value ?? null, payload.current_value ?? payload.default_value);
  revalidatePath("/admin/labels"); revalidatePath("/", "layout");
}

export async function resetContentLabel(formData: FormData) {
  const { supabase, user } = await requireRole(["editor", "admin"]);
  const id = String(formData.get("id") || "");
  const { data: old } = await supabase.from("content_labels").select("*").eq("id", id).maybeSingle();
  if (!old) throw new Error("Texto no encontrado");
  const { error } = await supabase.from("content_labels").update({ current_value: null, updated_by: user.id }).eq("id", id); if (error) throw error;
  await audit(supabase, user.id, "reset_label", "content_labels", id, old, { current_value: null });
  await revision(supabase, user.id, "content_labels", id, String(old.label_key), old.current_value, old.default_value);
  revalidatePath("/admin/labels"); revalidatePath("/", "layout");
}

export async function saveAnnouncement(formData: FormData) {
  const { supabase, user } = await requireRole(["editor", "admin"]);
  const id = String(formData.get("id") || "");
  const payload = {
    project: formData.get("project") || null,
    eyebrow: String(formData.get("eyebrow") || "").trim() || null,
    title: String(formData.get("title") || "").trim(),
    body: String(formData.get("body") || "").trim() || null,
    cta_label: String(formData.get("ctaLabel") || "").trim() || null,
    cta_href: optionalHref(formData.get("ctaHref")),
    audience: status(String(formData.get("audience") || "all"), ["all", "visitors", "members", "pass", "admins"]),
    status: status(String(formData.get("status") || "draft"), ["draft", "published", "hidden", "scheduled", "archived"]),
    starts_at: optionalDate(formData.get("startsAt")),
    ends_at: optionalDate(formData.get("endsAt")),
    position: Number(formData.get("position") || 0),
    updated_by: user.id,
  };
  if (!payload.title) throw new Error("El título es obligatorio");
  const { data: old } = id ? await supabase.from("announcements").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("announcements").update(payload).eq("id", id) : supabase.from("announcements").insert({ ...payload, created_by: user.id });
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await audit(supabase, user.id, id ? "update" : "create", "announcements", data.id, old, payload);
  revalidatePath("/admin/announcements"); revalidatePath("/", "layout");
}

export async function saveThemeTokens(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const project = projectOf(formData);
  const accent = String(formData.get("accentColor") || "");
  const background = String(formData.get("backgroundColor") || "");
  if (!hex.test(accent) || !hex.test(background)) throw new Error("Usa colores hex válidos");
  const payload = {
    project,
    heading_font: String(formData.get("headingFont") || "display"),
    body_font: String(formData.get("bodyFont") || "body"),
    heading_weight: Number(formData.get("headingWeight") || 800),
    heading_transform: status(String(formData.get("headingTransform") || "uppercase"), ["normal", "uppercase"]),
    letter_spacing: status(String(formData.get("letterSpacing") || "tight"), ["tight", "normal", "wide", "ultra-wide"]),
    accent_color: accent,
    background_color: background,
    surface_style: status(String(formData.get("surfaceStyle") || "glass"), ["solid", "glass", "chrome", "minimal"]),
    border_radius: status(String(formData.get("borderRadius") || "large"), ["none", "small", "medium", "large", "pill"]),
    glow_intensity: Number(formData.get("glowIntensity") || 2),
    animation_intensity: Number(formData.get("animationIntensity") || 2),
    noise_intensity: Number(formData.get("noiseIntensity") || 1),
    glitch_intensity: Number(formData.get("glitchIntensity") || 0),
    updated_by: user.id,
  };
  const { data: old } = await supabase.from("cms_theme_settings").select("*").eq("project", project).maybeSingle();
  const { data, error } = await supabase.from("cms_theme_settings").upsert(payload, { onConflict: "project" }).select("id").single(); if (error) throw error;
  await audit(supabase, user.id, old ? "update" : "create", "cms_theme_settings", data.id, old, payload);
  revalidatePath("/admin/theme"); revalidatePath("/", "layout");
}

export async function saveSystemSetting(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const keyName = key(String(formData.get("key") || ""));
  const value = {
    enabled: formData.get("enabled") === "on",
    message: String(formData.get("message") || "").trim() || null,
  };
  const { data: old } = await supabase.from("site_settings").select("*").eq("key", keyName).maybeSingle();
  const { error } = await supabase.from("site_settings").upsert({ key: keyName, value, is_public: true, updated_by: user.id }, { onConflict: "key" }); if (error) throw error;
  await audit(supabase, user.id, "upsert", "site_settings", keyName, old, value);
  revalidatePath("/admin/system"); revalidatePath("/", "layout");
}

export async function saveAppPreset(formData: FormData) {
  const { supabase, user } = await requireRole(["admin"]);
  const id = String(formData.get("id") || "");
  let config: unknown = {};
  try { config = JSON.parse(String(formData.get("config") || "{}")); } catch { throw new Error("Config debe ser JSON válido"); }
  const payload = {
    preset_key: key(String(formData.get("presetKey") || "")),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    config,
    active: formData.get("active") === "on",
    updated_by: user.id,
  };
  if (!payload.name) throw new Error("El nombre es obligatorio");
  const { data: old } = id ? await supabase.from("app_presets").select("*").eq("id", id).maybeSingle() : { data: null };
  const query = id ? supabase.from("app_presets").update(payload).eq("id", id) : supabase.from("app_presets").insert({ ...payload, created_by: user.id });
  const { data, error } = await query.select("id").single(); if (error) throw error;
  await audit(supabase, user.id, id ? "update" : "create", "app_presets", data.id, old, payload);
  revalidatePath("/admin/presets"); revalidatePath("/", "layout");
}

function contrast(a: string, b: string) { const luminance = (color: string) => { const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; }; const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (bright + .05) / (dark + .05); }
function optionalUuid(value: FormDataEntryValue | null) { const candidate = String(value || ""); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null; }
function optionalInt(value: FormDataEntryValue | null) { const number = Number(value || ""); return Number.isInteger(number) && number > 0 ? number : null; }
function optionalDate(value: FormDataEntryValue | null) { const raw = String(value || ""); if (!raw) return null; const date = new Date(raw); if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida"); return date.toISOString(); }
function optionalHref(value: FormDataEntryValue | null) { const href = String(value || "").trim(); if (!href) return null; if (!safeHref(href)) throw new Error("URL inválida"); return href; }
function key(value: string) { const result = value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, ""); if (!result) throw new Error("Key inválida"); return result; }
function slug(value: string) { const result = value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); if (!result) throw new Error("Slug inválido"); return result; }
function status<T extends string>(value: string, allowed: readonly T[]) { if (!allowed.includes(value as T)) throw new Error("Estado inválido"); return value as T; }
async function revision(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], userId: string, entityType: string, entityId: string, fieldKey: string, previousValue: unknown, newValue: unknown) {
  await supabase.from("content_revisions").insert({ entity_type: entityType, entity_id: entityId, field_key: fieldKey, previous_value: previousValue == null ? null : JSON.parse(JSON.stringify(previousValue)), new_value: newValue == null ? null : JSON.parse(JSON.stringify(newValue)), created_by: userId });
}
