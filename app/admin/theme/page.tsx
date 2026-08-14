import { saveThemeTokens } from "../actions";
import { requireRole } from "@/lib/auth/require-role";

export default async function ThemeAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("cms_theme_settings").select("*").order("project");
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">THEME MANAGER</span><h1>Safe design tokens</h1><p>Controla tipografía, color, glow, ruido y animaciones por universo sin abrir CSS libre ni romper contraste/layout.</p></div></header>
      <section className="settings-grid">
        {(["iamjoshwa", "afterluv"] as const).map((project) => <ThemeForm key={project} project={project} item={(data || []).find((item) => item.project === project)} />)}
      </section>
    </>
  );
}

function ThemeForm({ project, item }: { project: "iamjoshwa" | "afterluv"; item?: Record<string, unknown> }) {
  return (
    <form action={saveThemeTokens} className="settings-card theme-token-card">
      <input type="hidden" name="project" value={project} />
      <span>{project.toUpperCase()}</span>
      <label>Heading font<select name="headingFont" defaultValue={String(item?.heading_font || "display")}><option value="display">Display</option><option value="body">Body</option></select></label>
      <label>Body font<select name="bodyFont" defaultValue={String(item?.body_font || "body")}><option value="body">Body</option><option value="display">Display</option></select></label>
      <label>Heading weight<select name="headingWeight" defaultValue={String(item?.heading_weight || 800)}>{[400, 500, 600, 700, 800].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Heading transform<select name="headingTransform" defaultValue={String(item?.heading_transform || "uppercase")}><option value="normal">Normal</option><option value="uppercase">Uppercase</option></select></label>
      <label>Letter spacing<select name="letterSpacing" defaultValue={String(item?.letter_spacing || "tight")}><option value="tight">Tight</option><option value="normal">Normal</option><option value="wide">Wide</option><option value="ultra-wide">Ultra-wide</option></select></label>
      <label>Accent color<input name="accentColor" type="color" defaultValue={String(item?.accent_color || (project === "afterluv" ? "#ff2b2b" : "#a855f7"))} /></label>
      <label>Background<input name="backgroundColor" type="color" defaultValue={String(item?.background_color || "#050505")} /></label>
      <label>Surface style<select name="surfaceStyle" defaultValue={String(item?.surface_style || "glass")}><option value="solid">Solid</option><option value="glass">Glass</option><option value="chrome">Chrome</option><option value="minimal">Minimal</option></select></label>
      <label>Border radius<select name="borderRadius" defaultValue={String(item?.border_radius || "large")}><option value="none">None</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="pill">Pill</option></select></label>
      <label>Glow<input name="glowIntensity" type="range" min="0" max="3" defaultValue={String(item?.glow_intensity || 2)} /></label>
      <label>Animations<input name="animationIntensity" type="range" min="0" max="3" defaultValue={String(item?.animation_intensity || 2)} /></label>
      <label>Noise<input name="noiseIntensity" type="range" min="0" max="3" defaultValue={String(item?.noise_intensity || 1)} /></label>
      <label>Glitch<input name="glitchIntensity" type="range" min="0" max="3" defaultValue={String(item?.glitch_intensity || 0)} /></label>
      <button className="button primary">Guardar theme</button>
    </form>
  );
}
