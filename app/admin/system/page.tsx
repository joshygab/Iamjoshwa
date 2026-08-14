import { saveSystemSetting } from "../actions";
import { requireRole } from "@/lib/auth/require-role";

const controls = [
  ["maintenance_mode", "Maintenance Mode", "SIGNAL INTERRUPTED — IAMJOSHWA WORLD is currently being updated."],
  ["disable_booking", "Disable booking", "Booking is temporarily unavailable."],
  ["disable_pass_registration", "Disable Josh Pass registrations", "Pass registration is temporarily closed."],
  ["disable_login", "Disable login", "Login is temporarily unavailable."],
  ["disable_public_vault", "Disable public Vault", "The Vault is temporarily sealed."],
  ["hide_upcoming_shows", "Hide upcoming shows", "Shows are temporarily hidden."],
  ["hide_announcements", "Hide announcements", "Announcements are hidden."],
] as const;

export default async function SystemAdmin() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("site_settings").select("*").in("key", controls.map(([key]) => key));
  const map = new Map((data || []).map((item) => [item.key, item.value as { enabled?: boolean; message?: string }]));
  return (
    <>
      <header className="admin-hero"><div><span className="section-kicker">SYSTEM CONTROLS</span><h1>Emergency switches</h1><p>Controles globales preparados. Los admins siempre conservan acceso a /admin.</p></div></header>
      <section className="settings-grid">
        {controls.map(([key, label, defaultMessage]) => {
          const value = map.get(key);
          return <form action={saveSystemSetting} className="settings-card system-control-card" key={key}><input type="hidden" name="key" value={key} /><span>{label}</span><label className="checkbox"><input name="enabled" type="checkbox" defaultChecked={Boolean(value?.enabled)} /> Enabled</label><label>Message<textarea name="message" rows={3} defaultValue={value?.message || defaultMessage} /></label><button className="button secondary">Guardar control</button></form>;
        })}
      </section>
    </>
  );
}
