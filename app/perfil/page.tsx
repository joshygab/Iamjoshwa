import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import type { CSSProperties } from "react";
import { CalendarDays, Gift, LockKeyhole, Music2, QrCode, ShieldCheck, Sparkles, Ticket, Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { LevelUpSignal } from "@/components/pass/level-up-signal";
import { getLevelConfig, getLevelFromPoints, getLevelNumber, getNextLevelFromPoints } from "@/config/levels";
import { contentRepository } from "@/lib/data";
import { publicEnv } from "@/lib/env";
import { saveAvatar, savePreferences } from "./actions";

const genres = ["House", "Tech House", "Afro House", "Latin House", "Disco", "Nu Disco", "Hard Bounce", "Hard Trance", "Hard Techno", "Euro Dance"];
const requestTime = Date.now();

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
  const [events, releases, rewards] = await Promise.all([
    contentRepository.getEvents(),
    contentRepository.getReleases(),
    contentRepository.getRewards(),
  ]);

  const pointsBalance = Number(points?.points || 0);
  const xpTotal = Number(status?.points || pointsBalance || 0);
  const fallbackCurrent = getLevelFromPoints(xpTotal);
  const fallbackNext = getNextLevelFromPoints(xpTotal);
  const level = String(status?.level_name || fallbackCurrent.label);
  const levelConfig = getLevelConfig(level);
  const levelNumber = getLevelNumber(level);
  const levelMin = Number(status?.level_min_points || fallbackCurrent.minPoints || 0);
  const nextLevelConfig = status?.next_level_name ? getLevelConfig(String(status.next_level_name)) : fallbackNext;
  const nextLevel = nextLevelConfig?.label;
  const nextLevelPoints = status?.next_level_points ? Number(status.next_level_points) : fallbackNext?.minPoints;
  const progress = nextLevelPoints ? Math.max(0, Math.min(100, Math.round(((xpTotal - levelMin) / (nextLevelPoints - levelMin)) * 100))) : 100;
  const pointsToNext = nextLevelPoints ? Math.max(0, nextLevelPoints - xpTotal) : 0;
  const memberNumber = String(profile?.member_number || 0).padStart(6, "0");
  const displayName = String(profile?.public_alias || profile?.display_name || "Listener");
  const city = String(profile?.city || "Signal city");
  const origin = publicEnv.NEXT_PUBLIC_SITE_URL;
  const referralCode = String(profile?.referral_code || "").toUpperCase();
  const passUrl = referralCode ? `${origin}/pass/${referralCode}` : `${origin}/perfil`;
  const inviteUrl = referralCode ? `${origin}/r/${referralCode}` : `${origin}/acceso`;
  const qr = await QRCode.toDataURL(passUrl, { width: 420, margin: 1, errorCorrectionLevel: "H", color: { dark: "#050505", light: "#ffffff" } });
  const unlockedBadges = badges || [];
  const lockedSlots = Math.max(0, 6 - unlockedBadges.length);
  const favoriteProject = profile?.favorite_project === "afterluv" ? "afterluv" : "iamjoshwa";
  const nextEvent = events
    .filter((event) => event.universe === favoriteProject && new Date(event.date).getTime() >= requestTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const latestDrop = releases.filter((release) => release.universe === favoriteProject)[0];
  const vaultDrop = rewards.find((reward) => !reward.project || reward.project === favoriteProject);
  const passLevelStyle = {
    "--pass-level-color": levelConfig.color,
    "--pass-level-soft": levelConfig.softColor,
    "--pass-level-glow": levelConfig.glow,
    "--pass-next-level-color": nextLevelConfig?.color || levelConfig.color,
  } as CSSProperties;

  return (
    <section className="dashboard-page premium-pass-page pass-level-system" data-level={levelConfig.key} style={passLevelStyle}>
      <LevelUpSignal level={level} memberNumber={memberNumber} points={xpTotal} />
      <div className="profile-head pass-hero-head">
        <div>
          <span className="section-kicker">JOSH PASS · {levelConfig.label}</span>
          <h1>{displayName}</h1>
          <p>{city} · Member #{memberNumber} · {levelConfig.personality}</p>
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
        <div className="pass-card profile-pass premium-wallet-card level-wallet-card" data-project={favoriteProject} data-level={levelConfig.key}>
          <div className="pass-card-shine" />
          <div className="pass-card-top">
            {avatarUrl ? (
              <Image className="pass-avatar" src={avatarUrl} alt={`Avatar de ${displayName}`} width={104} height={104} />
            ) : (
              <div className="pass-avatar placeholder">{displayName.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="pass-top-label">
              <span>JOSH PASS</span>
              <small>INNER CIRCLE ACCESS</small>
            </div>
          </div>
          <div className="pass-identity-block">
            <small>@{displayName.replace(/^@/, "").toLowerCase()}</small>
            <strong>{displayName}</strong>
            <span>{city} · {String(profile?.country || "MX").toUpperCase()}</span>
          </div>
          <div className="pass-level-row" aria-label={`Nivel ${levelNumber}, ${levelConfig.label}`}>
            <span className="pass-level-dot" />
            <small>LEVEL {String(levelNumber).padStart(2, "0")}</small>
            <strong>{levelConfig.label}</strong>
          </div>
          <div className="pass-xp-strip">
            <div>
              <span>{xpTotal.toLocaleString("es-MX")} / {nextLevelPoints ? nextLevelPoints.toLocaleString("es-MX") : xpTotal.toLocaleString("es-MX")} XP</span>
              <small>{nextLevel ? `${pointsToNext.toLocaleString("es-MX")} XP para ${nextLevel}` : "Nivel máximo desbloqueado"}</small>
            </div>
            <div className="level-progress-track pass-xp-track" aria-label={`Progreso ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <small>{displayName} · {city}</small>
          <div className="profile-pass-meta">
            <span>{favoriteProject === "afterluv" ? "AFTERLUV SIGNAL" : "IAMJOSHWA SIGNAL"}</span>
            <code>#{memberNumber}</code>
          </div>
          <div className="pass-mini-badges">
            {(unlockedBadges.length ? unlockedBadges.slice(0, 3).map((item) => relationName(item.badges)) : ["Listener", "Inner Circle", "Vault Ready"]).map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>

        <div className="pass-status-panel">
          <div className="profile-grid pass-stats">
            <article>
              <span>XP</span>
              <strong>{xpTotal.toLocaleString("es-MX")}</strong>
            </article>
            <article>
              <span>PUNTOS</span>
              <strong>{pointsBalance.toLocaleString("es-MX")}</strong>
            </article>
            <article>
              <span>BADGES</span>
              <strong>{unlockedBadges.length}</strong>
            </article>
            <article>
              <span>INVITADOS</span>
              <strong>{inviteCount || 0}</strong>
            </article>
          </div>
          <article className="level-progress-card">
            <div>
              <span className="section-kicker">PROGRESO DE XP</span>
              <h2>{nextLevel ? `${pointsToNext.toLocaleString("es-MX")} XP para ${nextLevel}` : "Nivel máximo desbloqueado"}</h2>
              <p>{nextLevel ? `Vas al ${progress}% del camino. Cada acción verificada suma desde funciones seguras del servidor.` : "Ya estás en la cima del Inner Circle."}</p>
            </div>
            <div className="level-progress-track" aria-label={`Progreso ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="pass-next-level-line">
              <span>Actual · {levelConfig.label}</span>
              <span>{nextLevel ? `Siguiente · ${nextLevel}` : "Final tier · Legend"}</span>
            </div>
          </article>
          <div className="pass-first-actions">
            <Link href="/musica">
              <Music2 />
              <strong>Escucha un set</strong>
              <span>Gana puntos cuando la acción esté verificada.</span>
            </Link>
            <Link href="/fechas">
              <Ticket />
              <strong>Confirma asistencia</strong>
              <span>Activa check-ins y badges por evento.</span>
            </Link>
            <Link href="/the-vault">
              <LockKeyhole />
              <strong>Desbloquea Vault</strong>
              <span>Recompensas, drops privados y contenido limitado.</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="pass-live-command">
        <article>
          <Music2 />
          <span>LATEST DROP</span>
          <h2>{latestDrop?.title || "NEW DROP INCOMING"}</h2>
          <p>{latestDrop?.story || "Tu universo favorito todavía no liberó un lanzamiento activo. Mantén el Pass listo para recibir la señal."}</p>
          <Link className="button secondary" href={latestDrop ? `/lanzamientos/${latestDrop.slug}` : "/lanzamientos"}>
            Ver música
          </Link>
        </article>
        <article>
          <Ticket />
          <span>NEXT SHOW</span>
          <h2>{nextEvent?.name || "NEXT SIGNAL STANDBY"}</h2>
          <p>{nextEvent ? `${nextEvent.city} · ${formatDate(nextEvent.date)}` : "La próxima fecha oficial todavía no fue revelada para tu universo favorito."}</p>
          <Link className="button secondary" href={nextEvent ? `/fechas/${nextEvent.slug}` : "/fechas"}>
            Ver shows
          </Link>
        </article>
        <article>
          <LockKeyhole />
          <span>THE VAULT</span>
          <h2>{vaultDrop?.name || "Vault listo"}</h2>
          <p>{vaultDrop ? `${vaultDrop.pointsCost} puntos · ${vaultDrop.description}` : "Vault sealed. Las recompensas privadas se activarán como drops oficiales."}</p>
          <Link className="button primary" href="/the-vault">
            Abrir Vault
          </Link>
        </article>
      </section>

      <nav className="pass-view-nav" aria-label="Vistas del IAMJOSHWA Pass">
        <a href="#pass-view-pass">PASS</a>
        <a href="#pass-view-activity">ACTIVITY</a>
        <a href="#pass-view-collection">COLLECTION</a>
      </nav>

      <section id="pass-view-pass" className="pass-command-grid">
        <article className="qr-command-card">
          <div className="qr-frame level-qr-frame">
            <Image src={qr} alt="Código QR de invitación personal" width={220} height={220} unoptimized />
          </div>
          <div>
            <span className="section-kicker">QR PERSONAL · NIVEL {String(levelNumber).padStart(2, "0")}</span>
            <h2>Tu Pass escaneable.</h2>
            <code>{passUrl}</code>
            <p>Este QR abre tu credencial pública del IAMJOSHWA Pass. No muestra datos privados; solo alias, ciudad, nivel, número de miembro y estado del Pass.</p>
            <div className="inline-actions pass-qr-actions">
              <Link className="button secondary" href={passUrl} target="_blank">
                <QrCode /> Ver Pass público
              </Link>
              <Link className="button secondary" href={inviteUrl} target="_blank">
                Invitar con mi código
              </Link>
            </div>
            <Link className="button text-button" href="/recompensas">
              Ver reglas de puntos
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

      <section id="pass-view-collection" className="pass-showcase-grid">
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
              <span className="section-kicker">SIGNAL LEDGER</span>
              <h2>Historial de actividad</h2>
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
            <p className="muted">SIGNAL LEDGER listo. Tus acciones verificadas empezarán a escribir actividad aquí.</p>
          )}
        </article>
      </section>

      <section id="pass-view-activity" className="profile-activity premium-activity">
        <div>
          <CalendarDays />
          <h2>Eventos asistidos</h2>
          {attendance?.length ? attendance.map((item) => <p key={item.id}>{relationName(item.events)} · {formatDate(item.checked_in_at)}</p>) : <p>Event memory standby. Tu primer check-in activará esta sección.</p>}
        </div>
        <div>
          <Gift />
          <h2>Contenido desbloqueado</h2>
          {redemptions?.length ? redemptions.map((item) => <p key={item.id}>{relationName(item.rewards)} · {item.status}</p>) : <p>ACCESS QUEUED. Tus canjes y drops desbloqueados vivirán aquí.</p>}
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
  if (!value) return "Date queued";
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
