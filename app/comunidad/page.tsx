import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Crown,
  Disc3,
  Flame,
  Gem,
  Gift,
  Headphones,
  Instagram,
  LockKeyhole,
  QrCode,
  Radio,
  Route,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  Trophy,
  Unlock,
  UserPlus,
  Zap,
} from "lucide-react";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

const fallbackLevels = [
  { number: "01", name: "Listener", points: 0, body: "Entrada al universo, perfil y preferencias.", color: "silver" },
  { number: "02", name: "Inner Circle", points: 100, body: "Primeros desbloqueos por actividad verificada.", color: "violet" },
  { number: "03", name: "Raver", points: 350, body: "Check-ins, sets y acceso a drops seleccionados.", color: "blue" },
  { number: "04", name: "Afterlover", points: 800, body: "AFTERLUV, hard sessions y contenido más exclusivo.", color: "red" },
  { number: "05", name: "Day One", points: 1600, body: "Reconocimiento para fans constantes y referidos reales.", color: "gold" },
  { number: "06", name: "Legend", points: 3000, body: "Acceso máximo, recompensas especiales y prioridad.", color: "white" },
];
const requestTime = Date.now();

export const generateMetadata = () => pageMetadata({
  path: "/comunidad",
  title: "Comunidad",
  description: "IAMJOSHWA Pass, Inner Circle, misiones, niveles, puntos, badges, recompensas y acceso a The Vault.",
});

export default async function CommunityPage() {
  const [socials, events, sets, releases, rewards, member, levels] = await Promise.all([
    contentRepository.getSocialLinks(),
    contentRepository.getEvents(),
    contentRepository.getSets(),
    contentRepository.getReleases(),
    contentRepository.getRewards(),
    getMemberSignal(),
    getPassLevels(),
  ]);
  const instagram = socials.find((item) => item.platform?.toLowerCase() === "instagram" && (!item.project || item.project === "iamjoshwa"));
  const nextEvent = events.filter((item) => new Date(item.date).getTime() >= requestTime).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const latestSet = sets[0];
  const latestRelease = releases[0];
  const featuredReward = rewards[0];
  const level = levelFor(member?.points || 0, levels);
  const nextLevel = levels.find((item) => item.points > (member?.points || 0));
  const progress = nextLevel ? Math.min(100, Math.round(((member?.points || 0) / nextLevel.points) * 100)) : 100;
  const passName = member?.name || "JOSHY";
  const city = member?.city || "CDMX";
  const memberNumber = member?.memberNumber || "000124";
  const favoriteProject = member?.favoriteProject || "iamjoshwa";

  const missions = [
    { title: "Create / complete Pass", body: "Alias, ciudad, géneros y preferencias listas.", points: 25, href: "/perfil", icon: BadgeCheck, state: member?.onboardingCompleted ? "completed" : "available" },
    { title: "Listen to your first set", body: latestSet ? `Empieza con ${latestSet.title}.` : "Activa un set cuando el siguiente drop esté publicado.", points: 10, href: latestSet ? `/musica/${latestSet.slug}` : "/musica", icon: Headphones, state: latestSet ? "available" : "locked" },
    { title: "Follow the signal", body: instagram ? "Sigue Instagram para shows, drops y backstage." : "Agrega Instagram en Admin para activar esta misión.", points: 15, href: instagram?.url || "/acceso?next=%2Fperfil", icon: Instagram, state: instagram ? "available" : "locked", external: Boolean(instagram?.url) },
    { title: "Attend a show", body: nextEvent ? `Próxima señal: ${nextEvent.city} · ${nextEvent.venue}.` : "Cuando haya fecha activa, el check-in QR desbloquea puntos.", points: 40, href: nextEvent ? `/fechas/${nextEvent.slug}` : "/fechas", icon: CalendarDays, state: nextEvent ? "available" : "locked" },
    { title: "Enter The Vault", body: "Drops privados, códigos, demos y recompensas.", points: 20, href: "/the-vault", icon: LockKeyhole, state: "available" },
    { title: "Invite your crew", body: "Comparte tu código y suma cuando una cuenta se confirme.", points: 30, href: "/perfil#pass-view-activity", icon: UserPlus, state: member ? "available" : "locked" },
  ];

  const feed = [
    { kicker: "NEXT SHOW", title: nextEvent?.name || "NEXT SIGNAL — COMING SOON", body: nextEvent ? `${nextEvent.city} · ${nextEvent.venue}` : "La siguiente fecha se activará desde Admin.", href: nextEvent ? `/fechas/${nextEvent.slug}` : "/fechas", icon: CalendarDays },
    { kicker: "NOW PLAYING", title: latestSet?.title || "NEW SOUND INCOMING", body: latestSet ? `${latestSet.category} · ${latestSet.duration || "Set oficial"}` : "Publica un set para activarlo aquí.", href: latestSet ? `/musica/${latestSet.slug}` : "/musica", icon: Radio },
    { kicker: "DROP", title: latestRelease?.title || "NEXT RELEASE LOADING", body: latestRelease ? latestRelease.type : "El próximo lanzamiento aparecerá cuando tenga links.", href: latestRelease ? `/lanzamientos/${latestRelease.slug}` : "/lanzamientos", icon: Disc3 },
    { kicker: "REWARD", title: featuredReward?.name || "REWARD SLOT", body: featuredReward ? `${featuredReward.pointsCost} puntos` : "Crea recompensas desde Admin para llenar este espacio.", href: "/recompensas", icon: Gift },
  ];

  return (
    <>
      <section className="community-pro-hero">
        <div className="community-pro-bg" aria-hidden="true" />
        <div className="community-hero-copy">
          <span className="section-kicker">INNER CIRCLE</span>
          <h1>This is not a fanbase. It’s access.</h1>
          <p>Una sola identidad para IAMJOSHWA y AFTERLUV: misiones, puntos, badges, QR, shows, sets, recompensas y The Vault.</p>
          <div className="inline-actions">
            <Link className="button primary" href={member ? "/perfil" : "/acceso?next=%2Fperfil"}>
              {member ? "Ver mi Pass" : "Crear mi Pass"} <Sparkles />
            </Link>
            <Link className="button secondary" href="/the-vault">
              Entrar a The Vault <LockKeyhole />
            </Link>
          </div>
        </div>
        <CommunityPassCard name={passName} city={city} memberNumber={memberNumber} level={level.name} levelNumber={level.number} points={member?.points || 35} nextPoints={nextLevel?.points || 100} progress={progress || 35} project={favoriteProject} />
      </section>

      <section className="section community-status-strip">
        <article><Signal /><span>{member ? "SIGNED IN" : "GUEST MODE"}</span><strong>{member ? `Welcome back, ${passName}` : "Access waiting"}</strong></article>
        <article><Crown /><span>LEVEL</span><strong>{level.number} · {level.name}</strong></article>
        <article><Zap /><span>POINTS</span><strong>{(member?.points || 0).toLocaleString("es-MX")}</strong></article>
        <article><Unlock /><span>NEXT UNLOCK</span><strong>{nextLevel ? `${nextLevel.points - (member?.points || 0)} XP` : "Legend"}</strong></article>
      </section>

      <section className="section community-mission-board">
        <div className="section-heading">
          <div>
            <span className="section-kicker">MISSIONS</span>
            <h2>Short quests. Real movement.</h2>
          </div>
          <p className="muted">Las misiones se ven en frontend, pero los puntos solo se otorgan desde servidor.</p>
        </div>
        <div className="community-mission-grid">
          {missions.map((mission) => {
            const Icon = mission.icon;
            return (
              <Link href={mission.href} target={mission.external ? "_blank" : undefined} rel={mission.external ? "noreferrer" : undefined} data-state={mission.state} key={mission.title}>
                <div><Icon /><span>{mission.state.toUpperCase()}</span></div>
                <h3>{mission.title}</h3>
                <p>{mission.body}</p>
                <strong>+{mission.points} XP</strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section community-level-route">
        <div>
          <span className="section-kicker">LEVEL ROUTE</span>
          <h2>De oyente a leyenda.</h2>
          <p>Cada nivel debe sentirse como una nueva puerta: más acceso, más identidad, más señales privadas.</p>
        </div>
        <div className="community-level-track">
          {levels.map((item) => (
            <article data-color={item.color} data-active={(member?.points || 0) >= item.points} key={item.name}>
              <strong>{item.number}</strong>
              <span>{item.name}</span>
              <small>{item.points.toLocaleString("es-MX")} XP</small>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section community-feed">
        <div className="section-heading">
          <div>
            <span className="section-kicker">INNER CIRCLE FEED</span>
            <h2>Lo siguiente que puede mover tu Pass.</h2>
          </div>
          <Link className="text-link" href="/perfil">Abrir Pass <ArrowRight /></Link>
        </div>
        <div className="community-feed-grid">
          {feed.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.kicker}>
                <Icon />
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section community-reward-console">
        <div>
          <ShieldCheck />
          <span className="section-kicker">PASS → VAULT → REWARD</span>
          <h2>El contenido exclusivo debe sentirse ganado.</h2>
          <p>The Vault queda preparado para demos autorizados, edits, mashups, extended cuts, sets privados, descargas limitadas y recompensas. Tú controlas qué se publica desde el admin.</p>
          <div className="inline-actions">
            <Link className="button primary" href="/the-vault">Ver Vault <ArrowRight /></Link>
            <Link className="button secondary" href="/recompensas">Recompensas <Gift /></Link>
          </div>
        </div>
        <div className="community-unlock-stack">
          <article><Flame /><strong>Earn signals</strong><span>Sets, pre-saves, eventos y referidos.</span></article>
          <article><Trophy /><strong>Unlock status</strong><span>Listener → Legend.</span></article>
          <article><Gem /><strong>Claim drops</strong><span>Contenido publicado por el artista.</span></article>
        </div>
      </section>
    </>
  );
}

function CommunityPassCard({ name, city, memberNumber, level, levelNumber, points, nextPoints, progress, project }: { name: string; city: string; memberNumber: string; level: string; levelNumber: string; points: number; nextPoints: number; progress: number; project: string }) {
  return (
    <div className="community-pro-pass" data-project={project}>
      <div className="pass-card-shine" />
      <div className="community-pass-orbit" aria-hidden="true" />
      <div className="community-pass-top">
        <span>IAMJOSHWA PASS</span>
        <small>INNER CIRCLE ACCESS</small>
      </div>
      <div className="community-pass-name">
        <small>MEMBER #{memberNumber}</small>
        <strong>{name}</strong>
        <span>{city} · MX · LEVEL {levelNumber}</span>
      </div>
      <div className="community-pass-level">
        <Route />
        <div>
          <small>{level}</small>
          <strong>{points.toLocaleString("es-MX")} / {nextPoints.toLocaleString("es-MX")} XP</strong>
        </div>
      </div>
      <div className="community-pass-bottom">
        <div className="community-pass-badges">
          <span><Star /> Listener</span>
          <span><QrCode /> QR Ready</span>
          <span><LockKeyhole /> Vault</span>
        </div>
        <div className="community-pass-qr" aria-hidden="true"><span /><span /><span /><span /></div>
      </div>
      <div className="community-pass-progress"><span style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

async function getMemberSignal() {
  const db = await createClient();
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: ledger }] = await Promise.all([
    db.from("profiles").select("display_name,public_alias,city,country,favorite_project,member_number,onboarding_completed").eq("id", user.id).maybeSingle(),
    db.from("points_ledger").select("points").eq("user_id", user.id).limit(1000),
  ]);
  const points = (ledger || []).reduce((sum, item) => sum + Number(item.points || 0), 0);
  return {
    name: String(profile?.public_alias || profile?.display_name || user.email?.split("@")[0] || "Member").toUpperCase(),
    city: String(profile?.city || "CDMX").toUpperCase(),
    memberNumber: String(profile?.member_number || "000124").padStart(6, "0"),
    favoriteProject: profile?.favorite_project === "afterluv" ? "afterluv" : "iamjoshwa",
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    points,
  };
}

function levelFor(points: number, levels = fallbackLevels) {
  return [...levels].reverse().find((item) => points >= item.points) || levels[0] || fallbackLevels[0];
}

async function getPassLevels() {
  const db = await createClient();
  const fallback = fallbackLevels;
  if (!db) return fallback;
  const { data, error } = await db.from("fan_levels").select("id,name,min_points,position").order("position");
  if (error || !data?.length) return fallback;
  return data.map((item) => {
    const base = fallback.find((level) => level.name === item.name) || fallback[Math.max(0, Number(item.position || 1) - 1)] || fallback[0];
    return {
      ...base,
      number: String(item.position || item.id).padStart(2, "0"),
      name: String(item.name),
      points: Number(item.min_points || 0),
    };
  });
}
