import { requireRole } from "@/lib/auth/require-role";
import { MediaStudio } from "@/components/admin/media-studio";

export default async function MediaAdmin() {
  const { supabase, role } = await requireRole(["editor", "admin"]);
  const [
    { data },
    { data: usageRows },
    { data: galleryItems },
    { data: artists },
    { data: events },
    { data: releases },
    { data: sets },
    { data: timeline },
    { data: rewards },
    { data: seo },
    { data: sections },
  ] = await Promise.all([
    supabase
      .from("media_assets")
      .select("id,bucket,display_name,title,description,alt_text,tags,mime_type,byte_size,storage_path,archived_at,width,height,duration_seconds,focal_x,focal_y")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("media_usage").select("asset_id,entity_type,field_name"),
    supabase.from("media_items").select("asset_id,publication_status").neq("publication_status", "archived"),
    supabase.from("artist_profiles").select("logo_asset_id,alternate_logo_asset_id,hero_desktop_asset_id,hero_mobile_asset_id,display_name"),
    supabase.from("events").select("flyer_asset_id,name,publication_status").neq("publication_status", "archived"),
    supabase.from("releases").select("cover_asset_id,preview_asset_id,name,publication_status").neq("publication_status", "archived"),
    supabase.from("sets").select("cover_asset_id,audio_asset_id,title,publication_status").neq("publication_status", "archived"),
    supabase.from("artist_timeline").select("asset_id,title,publication_status").neq("publication_status", "archived"),
    supabase.from("rewards").select("image_asset_id,name,publication_status").neq("publication_status", "archived"),
    supabase.from("seo_metadata").select("share_asset_id,path"),
    supabase.from("page_sections").select("content,page_key,publication_status").neq("publication_status", "archived"),
  ]);

  const usage = new Map<string, string[]>();
  const addUsage = (assetId: unknown, label: string) => {
    if (typeof assetId !== "string" || !assetId) return;
    const current = usage.get(assetId) || [];
    current.push(label);
    usage.set(assetId, current);
  };

  for (const item of usageRows || []) addUsage(item.asset_id, `${item.entity_type} · ${item.field_name}`);
  for (const item of galleryItems || []) addUsage(item.asset_id, "Galería pública");
  for (const item of artists || []) {
    addUsage(item.logo_asset_id, `Logo · ${item.display_name}`);
    addUsage(item.alternate_logo_asset_id, `Logo alternativo · ${item.display_name}`);
    addUsage(item.hero_desktop_asset_id, `Hero desktop · ${item.display_name}`);
    addUsage(item.hero_mobile_asset_id, `Hero móvil · ${item.display_name}`);
  }
  for (const item of events || []) addUsage(item.flyer_asset_id, `Flyer · ${item.name}`);
  for (const item of releases || []) {
    addUsage(item.cover_asset_id, `Cover · ${item.name}`);
    addUsage(item.preview_asset_id, `Preview · ${item.name}`);
  }
  for (const item of sets || []) {
    addUsage(item.cover_asset_id, `Cover set · ${item.title}`);
    addUsage(item.audio_asset_id, `Audio set · ${item.title}`);
  }
  for (const item of timeline || []) addUsage(item.asset_id, `Historia · ${item.title}`);
  for (const item of rewards || []) addUsage(item.image_asset_id, `Recompensa · ${item.name}`);
  for (const item of seo || []) addUsage(item.share_asset_id, `SEO · ${item.path}`);
  for (const item of sections || []) {
    const content = (item.content || {}) as Record<string, unknown>;
    addUsage(content.media_asset_id, `Portada · ${item.page_key}`);
  }

  const assets = (data || []).map((asset) => {
    const labels = usage.get(asset.id) || [];
    return {
      ...asset,
      usage_count: labels.length,
      usage_labels: labels.slice(0, 8),
      in_gallery: labels.includes("Galería pública"),
      public_url:
        asset.bucket === "public-media"
          ? supabase.storage.from("public-media").getPublicUrl(asset.storage_path).data.publicUrl
          : "",
    };
  });

  return (
    <>
      <header className="admin-hero media-admin-hero">
        <div>
          <span className="section-kicker">MEDIA STUDIO</span>
          <h1>Biblioteca multimedia</h1>
          <p>
            Sube fotos, videos, PDFs y audio MP3/WAV una vez. Luego reutilízalos en portada, eventos,
            sets, lanzamientos, EPK, perfil y reproductores.
            Ahora puedes ver dónde se usa cada archivo antes de archivarlo o eliminarlo.
          </p>
        </div>
      </header>
      <MediaStudio assets={assets} isAdmin={role === "admin"} />
    </>
  );
}
