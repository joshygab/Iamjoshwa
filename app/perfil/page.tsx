import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { CalendarDays, Gift, QrCode, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { saveAvatar, savePreferences } from "./actions";

const genres = ["House", "Tech House", "Afro House", "Latin House", "Disco", "Nu Disco", "Hard Bounce", "Hard Trance", "Hard Techno", "Euro Dance"];
const fallbackLevels = [
  { name: "Listener", min: 0 },
  { name: "Inner Circle", min: 100 },
  { name: "Raver", min: 350 },
  { name: "Afterlover", min: 800 },
  { name: "Day One", min: 1600 },
  { name: "Legend", min: 3000 },
];

export const metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const db = await createClient();
  if (!db) redirect("/acceso");

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const avatarUrl = profile?.avatar_path ? db.storage.from("user-avatars").getPublicUrl(profile.avatar_path).data.publicUrl : null;

  const [{ data: points }, { data: status }, { count: inviteCount }, { data: prefs }, { data: badges }, { data: attendance }, { data: redemptions }, { data: consents }, { data: ledger }] =
    await Promise.all([
      db.from("fan_point_totals").select("points").eq("user_id", user.id).maybeSingle(),
      db.from("fan_status").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id),
      db.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("user_badges").select("awarded_at,badges(name,description)").eq("user_id", user.id).order("awarded_at", { ascending: false }),
      db.from("event_checkins").select("id,checked_in_at,events(name,city)").eq("user_id", user.id).order("checked_in_at", { ascending: false }).limit(4),
      db.from("reward_redemptions").select("id,status,created_at,rewards(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      db.from("notification_consents").select("granted").eq("user_id", user.id).eq("channel", "email").order("created_at", { ascending: false }).limit(1),
      db.from("points_ledger").select("id,points,reason,source_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    ]);

  const total = Number(points?.points || status?.points || 0);
  const fallbackCurrent = fallbackLevels.toReversed().find((item) => total >= item.min) || fallbackLevels[0];
  const fallbackNext = fallbackLevels.find((item) => item.min > total);
  const level = String(status?.level_name || fallbackCurrent.name);
  const levelMin = Number(status?.level_min_points || fallbackCurrent.min || 0);
  const nextLevel = status?.next_level_name ? String(status.next_level_name) : fallbackNext?.name;
  const nextLevelPoints = status?.next_level_points ? Number(status.next_level_points) : fallbackNext?.min;
  const progress = nextLevelPoints ? Math.max(0, Math.min(100, Math.round(((total - levelMin) / (nextLevelPoints - levelMin)) * 100))) : 100;
  const pointsToNext = nextLevelPoints ? Math.max(0, nextLevelPoints - total) : 0;
  const memberNumber = String(profile?.member_number || 0).padStart(6, "0");
  const displayName = String(profile?.public_alias || profile?.display_name || "Listener");
  const city = String(profile?.city || "Ciudad sin configurar");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const referralCode = String(profile?.referral_code || "pendiente");
  const inviteUrl = referralCode === "pendiente" ? `${origin}/acceso` : `${origin}/r/${referralCode}`;
  const qr = await QRCode.toDataURL(inviteUrl, { width: 300, margin: 1, color: { dark: "#050505", light: "#ffffff" } });
  const unlockedBadges = badges || [];
  const lockedSlots = Math.max(0, 6 - unlockedBadges.length);

  return (
    <section className="dashboard-page premium-pass-page">
      <div className="profile-head pass-hero-head">
        <div>
          <span className="section-kicker">IAMJOSHWA PASS</span>
          <h1>{displayName}</h1>
          <p>{city} · Miembro #{memberNumber}</p>
        </div>
        <div className="inline-actions">
          <Link className="button primary" href="/recompensas">
            <Gift /> Recompensas
          </Link>
          <form action={signOut}>
            <button className="button secondary">Cerrar sesión</button>
          </form>
        </div>
      </div>

      <section className="pass-console">
        <div className="pass-card profile-pass premium-wallet-card">
          <div className="pass-card-shine" />
          <div className="pass-card-top">
            {avatarUrl ? (
              <Image className="pass-avatar" src={avatarUrl} alt={`Avatar de ${displayName}`} width={104} height={104} />
            ) : (
              <div className="pass-avatar placeholder">{displayName.slice(0, 1).toUpperCase()}</div>
            )}
            <span>IAMJOSHWA PASS</span>
          </div>
          <strong>
            {memberNumber}
            <br />
            {level.toUpperCase()}
          </strong>
          <small>{displayName} · {city}</small>
        </div>

        <div className="pass-status-panel">
          <div className="profile-grid pass-stats">
            <article>
              <span>PUNTOS</span>
              <strong>{total}</strong>
            </article>
            <article>
              <span>NIVEL</span>
              <strong>{level}</strong>
            </article>
            <article>
              <span>INVITADOS</span>
              <strong>{inviteCount || 0}</strong>
            </article>
          </div>
          <article className="level-progress-card">
            <div>
              <span className="section-kicker">PROGRESO DE NIVEL</span>
              <h2>{nextLevel ? `${pointsToNext} puntos para ${nextLevel}` : "Nivel máximo desbloqueado"}</h2>
              <p>{nextLevel ? `Vas al ${progress}% del camino. Cada acción verificada suma desde funciones seguras del servidor.` : "Ya estás en la cima del Inner Circle."}</p>
            </div>
            <div className="level-progress-track" aria-label={`Progreso ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </article>
        </div>
      </section>

      <section className="pass-command-grid">
        <article className="qr-command-card">
          <div className="qr-frame">
            <Image src={qr} alt="Código QR de invitación personal" width={220} height={220} unoptimized />
          </div>
          <div>
            <span className="section-kicker">QR PERSONAL</span>
            <h2>Tu entrada al Inner Circle.</h2>
            <code>{inviteUrl}</code>
            <p>Comparte este enlace. Las recompensas solo se procesan cuando la cuenta invitada se confirma.</p>
            <Link className="button secondary" href="/recompensas">
              <QrCode /> Ver reglas
            </Link>
          </div>
        </article>

        <form action={saveAvatar} className="settings-card avatar-form pass-upload-card">
          <span>FOTO DEL PASS</span>
          <h2>Actualiza tu identidad visual.</h2>
          <label>
            Subir foto cuadrada
            <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          </label>
          <p className="form-note">Recomendado: foto cuadrada. La app la recorta a 1:1 y la optimiza automáticamente.</p>
          <button className="button secondary">Guardar foto</button>
        </form>
      </section>

      <section className="pass-showcase-grid">
        <article className="badge-vault">
          <div className="section-heading">
            <div>
              <span className="section-kicker">BADGES</span>
              <h2>Insignias desbloqueadas</h2>
            </div>
            <Sparkles />
          </div>
          <div className="badge-grid">
            {unlockedBadges.map((item, index) => (
              <div className="badge-token unlocked" key={`${relationName(item.badges)}-${index}`}>
                <ShieldCheck />
                <strong>{relationName(item.badges)}</strong>
                <span>{formatDate(item.awarded_at)}</span>
              </div>
            ))}
            {Array.from({ length: lockedSlots }).map((_, index) => (
              <div className="badge-token locked" key={`locked-${index}`}>
                <Trophy />
                <strong>Badge bloqueado</strong>
                <span>Completa acciones para desbloquearlo</span>
              </div>
            ))}
          </div>
        </article>

        <article className="points-timeline">
          <div className="section-heading">
            <div>
              <span className="section-kicker">LEDGER</span>
              <h2>Historial de puntos</h2>
            </div>
            <Zap />
          </div>
          {ledger?.length ? (
            <ol>
              {ledger.map((item) => (
                <li key={item.id}>
                  <span className={Number(item.points) > 0 ? "positive" : "negative"}>{Number(item.points) > 0 ? `+${item.points}` : item.points}</span>
                  <div>
                    <strong>{item.reason}</strong>
                    <small>{item.source_type} · {formatDate(item.created_at)}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Tus movimientos aparecerán aquí cuando escuches sets, confirmes asistencia o desbloquees recompensas.</p>
          )}
        </article>
      </section>

      <section className="profile-activity premium-activity">
        <div>
          <CalendarDays />
          <h2>Eventos asistidos</h2>
          {attendance?.length ? attendance.map((item) => <p key={item.id}>{relationName(item.events)} · {formatDate(item.checked_in_at)}</p>) : <p>Tus check-ins verificados aparecerán aquí.</p>}
        </div>
        <div>
          <Gift />
          <h2>Contenido desbloqueado</h2>
          {redemptions?.length ? redemptions.map((item) => <p key={item.id}>{relationName(item.rewards)} · {item.status}</p>) : <p>Aún no has canjeado recompensas.</p>}
        </div>
        <div>
          <Sparkles />
          <h2>Próximo desbloqueo</h2>
          <p>{nextLevel ? `Al llegar a ${nextLevel} podrás activar recompensas más exclusivas.` : "Mantén tu actividad para conservar el estatus Legend."}</p>
        </div>
      </section>

      <form action={savePreferences} className="onboarding-form profile-preferences premium-preferences">
        <span className="section-kicker">PREFERENCIAS</span>
        <h2>Controla tu señal.</h2>
        <div className="field-grid">
          <label>Nombre<input name="name" required defaultValue={profile?.display_name || ""} /></label>
          <label>Alias<input name="alias" defaultValue={profile?.public_alias || ""} /></label>
          <label>Ciudad<input name="city" required defaultValue={profile?.city || ""} /></label>
          <label>País<input name="country" required defaultValue={profile?.country || ""} /></label>
          <label>
            Proyecto
            <select name="project" defaultValue={profile?.favorite_project || "iamjoshwa"}>
              <option value="iamjoshwa">IAMJOSHWA</option>
              <option value="afterluv">AFTERLUV</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Géneros</legend>
          <div className="choice-grid">{genres.map((genre) => <label key={genre}><input type="checkbox" name="genres" value={genre} defaultChecked={profile?.favorite_genres?.includes(genre)} />{genre}</label>)}</div>
        </fieldset>
        <fieldset>
          <legend>Avisos</legend>
          <div className="choice-grid">
            {[
              ["events", "Próximas fechas", prefs?.event_announcements],
              ["releases", "Lanzamientos", prefs?.releases],
              ["presaves", "Pre-saves", prefs?.presaves],
              ["sets", "Sets", prefs?.sets],
              ["tickets", "Boletos", prefs?.ticket_alerts],
              ["secret", "Eventos secretos", prefs?.secret_events],
              ["exclusive", "Contenido exclusivo", prefs?.exclusive_content],
              ["iamjoshwa", "IAMJOSHWA", prefs?.iamjoshwa],
              ["afterluv", "AFTERLUV", prefs?.afterluv],
              ["cityBased", "Según mi ciudad", prefs?.city_based],
            ].map(([name, label, checked]) => (
              <label key={String(name)}><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />{String(label)}</label>
            ))}
          </div>
        </fieldset>
        <label className="checkbox">
          <input name="communications" type="checkbox" defaultChecked={Boolean(consents?.[0]?.granted)} />
          Acepto recibir comunicaciones por email.
        </label>
        <button className="button primary">Guardar preferencias</button>
      </form>
      <DeleteAccountButton />
    </section>
  );
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return String(value[0]?.name || "Registro");
  if (value && typeof value === "object" && "name" in value) return String(value.name);
  return "Registro";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Fecha pendiente";
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
