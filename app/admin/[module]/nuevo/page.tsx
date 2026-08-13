import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { ContentEditor } from "@/components/admin/content-editor";

const supported = ["eventos", "lanzamientos", "sets", "historia", "epk", "recompensas", "campanas"];

export default async function NewContent({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!supported.includes(module)) notFound();
  const { supabase } = await requireRole(["editor", "admin"]);
  const { data } = await supabase
    .from("media_assets")
    .select("id,display_name,mime_type,byte_size,bucket,storage_path")
    .eq("bucket", "public-media")
    .is("archived_at", null)
    .order("display_name");
  const assets = (data || []).map((asset) => ({
    id: asset.id,
    display_name: asset.display_name,
    mime_type: asset.mime_type,
    byte_size: asset.byte_size,
    public_url: supabase.storage.from("public-media").getPublicUrl(asset.storage_path).data.publicUrl,
  }));
  return (
    <>
      <header className="admin-header">
        <div>
          <span className="section-kicker">NUEVO REGISTRO</span>
          <h1>Crear contenido</h1>
        </div>
      </header>
      <ContentEditor module={module} assets={assets} />
    </>
  );
}
