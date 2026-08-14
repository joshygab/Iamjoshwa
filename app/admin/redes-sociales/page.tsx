import { deleteSocialLink, saveSocialLink } from "@/app/admin/actions";
import { requireRole } from "@/lib/auth/require-role";
import { AtSign, ExternalLink, Grip, Instagram } from "lucide-react";

const platforms = ["instagram", "tiktok", "spotify", "apple_music", "soundcloud", "youtube", "mixcloud", "beatport", "facebook", "x", "whatsapp", "website"];

export default async function SocialNetworksAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const { data: socials } = await supabase.from("social_links").select("*").order("position");

  return (
    <>
      <header className="admin-hero social-admin-hero">
        <div>
          <span className="section-kicker">REDES SOCIALES</span>
          <h1>Conecta tus canales oficiales.</h1>
          <p>Agrega tus redes una vez aquí. En la web pública se verán como logos limpios al final del sitio.</p>
        </div>
        <Instagram />
      </header>

      <section className="social-admin-grid">
        <form action={saveSocialLink} className="settings-card social-admin-form">
          <span>NUEVA RED</span>
          <label>Plataforma<PlatformSelect /></label>
          <label>Etiqueta visible<input name="label" placeholder="@iamjoshwa" required /></label>
          <label>URL HTTPS<input name="url" type="url" placeholder="https://instagram.com/..." required /></label>
          <label>Universo<select name="project"><option value="">Ambos</option><option value="iamjoshwa">IAMJOSHWA</option><option value="afterluv">AFTERLUV</option></select></label>
          <label>Orden<input name="position" type="number" defaultValue="0" /></label>
          <label className="checkbox"><input name="active" type="checkbox" defaultChecked /> Activa</label>
          <button className="button primary">Agregar red</button>
        </form>

        <div className="social-admin-list">
          {(socials || []).length ? socials?.map((item) => (
            <form action={saveSocialLink} className="social-admin-card" key={item.id}>
              <input type="hidden" name="id" value={item.id} />
              <div className="social-admin-icon"><AtSign /></div>
              <div className="social-admin-fields">
                <label>Plataforma<PlatformSelect value={item.platform} /></label>
                <label>Etiqueta<input name="label" defaultValue={item.label || ""} required /></label>
                <label>URL<input name="url" type="url" defaultValue={item.url} required /></label>
                <div className="social-admin-row">
                  <label>Universo<select name="project" defaultValue={item.project || ""}><option value="">Ambos</option><option value="iamjoshwa">IAMJOSHWA</option><option value="afterluv">AFTERLUV</option></select></label>
                  <label>Orden<input name="position" type="number" defaultValue={item.position || 0} /></label>
                  <label className="checkbox"><input name="active" type="checkbox" defaultChecked={item.active} /> Activa</label>
                </div>
              </div>
              <div className="social-admin-actions">
                <a className="button secondary" href={item.url} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a>
                <button className="button primary"><Grip /> Guardar</button>
                <button className="button danger-button" formAction={deleteSocialLink}>Eliminar</button>
              </div>
            </form>
          )) : (
            <div className="admin-empty">
              <h2>Aún no hay redes.</h2>
              <p>Agrega Instagram, Spotify, YouTube o cualquier canal oficial para que aparezca en el footer público.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PlatformSelect({ value }: { value?: string | null }) {
  return (
    <select name="platform" defaultValue={value || "instagram"}>
      {platforms.map((platform) => <option value={platform} key={platform}>{platformLabel(platform)}</option>)}
    </select>
  );
}

function platformLabel(value: string) {
  return value.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
