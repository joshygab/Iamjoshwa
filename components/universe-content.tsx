"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, Headphones, LockKeyhole, MapPin, Play, QrCode, Radio, Sparkles, Ticket } from "lucide-react";
import { Countdown } from "./countdown";
import type { CountdownType } from "./countdown";
import { usePlayer } from "./player-provider";
import { useUniverse } from "./universe-provider";
import { dateToTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { ArtistProfileItem, EventItem, PageSectionItem, ReleaseItem, RewardItem, SetItem, Universe } from "@/types/content";

const fallback: Record<Universe, ArtistProfileItem> = {
  iamjoshwa: {
    project: "iamjoshwa",
    displayName: "IAMJOSHWA",
    subtitle: "DJ & Producer — CDMX",
    tagline: "Club culture, latin pulse and electronic nights from Mexico City.",
    shortBio: "",
    longBio: "",
    baseCity: "Ciudad de México",
    genres: [],
  },
  afterluv: {
    project: "afterluv",
    displayName: "AFTERLUV",
    subtitle: "The harder side of IAMJOSHWA",
    tagline: "Fast, dark, emotional signals for the afterhours.",
    shortBio: "",
    longBio: "",
    baseCity: "Ciudad de México",
    genres: [],
  },
};

type Props = {
  events: EventItem[];
  sets: SetItem[];
  releases: ReleaseItem[];
  rewards?: RewardItem[];
  artists?: ArtistProfileItem[];
  sections?: PageSectionItem[];
  now: number;
};

type PersonalSignal = {
  city: string | null;
  favoriteProject: Universe;
  wantsShows: boolean;
  wantsSets: boolean;
  wantsReleases: boolean;
};

type SignalCandidate = {
  id: string;
  href: string;
  type: CountdownType;
  label: string;
  title: string;
  subtitle: string;
  targetDate: string;
  time: number;
};

const missions = [
  ["01", "Listen to your first set", "Activa el player global y empieza tu historial musical.", "/musica"],
  ["02", "Complete your Pass", "Alias, ciudad, géneros y preferencias listas.", "/perfil"],
  ["03", "Enter The Vault", "Explora drops, códigos y recompensas bloqueadas.", "/the-vault"],
  ["04", "Book / Share", "Promotores encuentran EPK, contacto y booking en segundos.", "/booking"],
] as const;

export function HomeContent({ events, sets, releases, rewards = [], artists = [], sections = [], now }: Props) {
  const { universe, setUniverse } = useUniverse();
  const { play } = usePlayer();
  const [signal, setSignal] = useState<PersonalSignal | null>(null);
  const artist = artists.find((item) => item.project === universe) || fallback[universe];
  const managed = sections.filter((item) => !item.project || item.project === universe);
  const hero = managed.find((item) => item.blockType === "hero")?.content || {};

  const scopedEvents = useMemo(() => events.filter((item) => item.universe === universe).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events, universe]);
  const scopedSets = useMemo(() => sets.filter((item) => item.universe === universe), [sets, universe]);
  const scopedReleases = useMemo(() => releases.filter((item) => item.universe === universe), [releases, universe]);
  const scopedRewards = useMemo(() => rewards.filter((item) => !item.project || item.project === universe), [rewards, universe]);
  const event = scopedEvents.find((item) => new Date(item.date).getTime() >= now) || scopedEvents[0];
  const liveEvent = event && isLiveWindow(event.date, now) ? event : null;
  const recentPastEvent = scopedEvents.filter((item) => isRecentPastEvent(item.date, now)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const release = scopedReleases[0];
  const set = scopedSets[0];
  const nextSignal = useMemo(() => {
    const candidates: SignalCandidate[] = [
      ...scopedEvents.map((item) => ({ id: item.id, href: `/fechas/${item.slug}`, type: universe === "afterluv" ? "afterluv" : "show", label: universe === "afterluv" ? "AFTERLUV TRANSMISSION" : "NEXT SHOW", title: item.name, subtitle: `${item.city} · ${item.venue}`, targetDate: item.date, time: dateToTime(item.date) || 0 } satisfies SignalCandidate)),
      ...scopedReleases.map((item) => ({ id: item.id, href: `/lanzamientos/${item.slug}`, type: item.universe === "afterluv" ? "afterluv" : "release", label: item.universe === "afterluv" ? "TRANSMISSION BEGINS IN" : "NEXT RELEASE", title: item.title, subtitle: item.type, targetDate: item.releaseAt, time: dateToTime(item.releaseAt) || 0 } satisfies SignalCandidate)),
      ...scopedRewards.flatMap((item) => {
        const rewardSignals: SignalCandidate[] = [];
        if (item.unlockAt) rewardSignals.push({ id: item.id, href: "/the-vault", type: "vault", label: "VAULT UNLOCK", title: item.name, subtitle: "Unlocks in", targetDate: item.unlockAt, time: dateToTime(item.unlockAt) || 0 });
        if (item.expiresAt) rewardSignals.push({ id: item.id, href: "/the-vault", type: "vault", label: "VAULT EXPIRATION", title: item.name, subtitle: "Expires in", targetDate: item.expiresAt, time: dateToTime(item.expiresAt) || 0 });
        return rewardSignals;
      }),
    ];
    return candidates
      .filter((item) => item.time > now)
      .sort((a, b) => a.time - b.time)[0];
  }, [now, scopedEvents, scopedReleases, scopedRewards, universe]);

  const title = String(hero.title || artist.displayName);
  const tagline = String(hero.subtitle || artist.tagline);
  const heroMediaUrl = typeof hero.media_url === "string" ? hero.media_url : "";
  const heroIsVideo = typeof hero.media_mime_type === "string" && hero.media_mime_type.startsWith("video/");
  const heroStyle = {
    "--hero-bg": !heroIsVideo && heroMediaUrl ? `url(${heroMediaUrl})` : artist.heroDesktopUrl ? `url(${artist.heroDesktopUrl})` : undefined,
    "--hero-mobile-bg": artist.heroMobileUrl ? `url(${artist.heroMobileUrl})` : undefined,
  } as CSSProperties;

  useEffect(() => {
    let cancelled = false;
    async function loadSignal() {
      if (!isSupabaseConfigured) return;
      const db = createClient();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user || cancelled) return;
      const [{ data: profile }, { data: prefs }] = await Promise.all([
        db.from("profiles").select("city,favorite_project").eq("id", user.id).maybeSingle(),
        db.from("notification_preferences").select("event_announcements,sets,releases").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled || !profile) return;
      setSignal({
        city: profile.city || null,
        favoriteProject: profile.favorite_project === "afterluv" ? "afterluv" : "iamjoshwa",
        wantsShows: prefs?.event_announcements !== false,
        wantsSets: prefs?.sets !== false,
        wantsReleases: prefs?.releases !== false,
      });
    }
    void loadSignal();
    return () => {
      cancelled = true;
    };
  }, []);

  function startSet() {
    if (!set || set.demo) return;
    if (!set.audioUrl && !set.embedUrl && set.externalUrl) {
      window.open(set.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    play(set);
  }

  return (
    <>
      {isVisible(managed, "hero") ? (
        <section className="hero cinematic-hero world-hero" style={heroStyle}>
          {heroIsVideo ? <video className="hero-video" src={heroMediaUrl} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" /> : null}
          <div className="cinema-depth" />
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-grid" />
          <div className="hero-content world-hero-content reveal is-visible">
            {artist.logoUrl ? <Image className="hero-logo" src={artist.logoUrl} alt={`${artist.displayName} logo`} width={420} height={160} priority /> : null}
            <p className="eyebrow">{liveEvent ? "LIVE TONIGHT" : universe === "afterluv" ? "AFTERLUV SIGNAL" : "IAMJOSHWA WORLD"}</p>
            <h1>{title}</h1>
            <p className="hero-tagline">{tagline}</p>
            <div className="hero-actions">
              <Link className="button primary hero-main-cta" href="/musica">
                <Play /> Listen
              </Link>
              <Link className="button secondary" href="/booking">
                Book Now
              </Link>
            </div>
            <div className="hero-signal-row" aria-label="Señales principales del sitio">
              <span>CDMX</span>
              <span>{universe === "afterluv" ? "RAVE / HARD / TRANCE" : "HOUSE / LATIN / CLUB"}</span>
              <span>NO AUTOPLAY</span>
            </div>
          </div>
          <div className="scroll-note">Scroll<span /></div>
        </section>
      ) : null}

      {liveEvent ? (
        <section className="section live-tonight-panel reveal is-visible">
          <div>
            <p className="section-kicker">LIVE TONIGHT</p>
            <h2>{liveEvent.name}</h2>
            <p>{liveEvent.city} · {liveEvent.venue} · {new Date(liveEvent.date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="live-command-actions">
            {liveEvent.mapUrl ? <a className="button primary" href={liveEvent.mapUrl} target="_blank" rel="noreferrer"><MapPin /> Mapa</a> : <Link className="button primary" href={`/fechas/${liveEvent.slug}`}><MapPin /> Info rápida</Link>}
            <Link className="button secondary" href="/checkin"><QrCode /> QR check-in</Link>
            <Link className="button secondary" href={`/fechas/${liveEvent.slug}`}><Ticket /> Boletos / detalles</Link>
          </div>
        </section>
      ) : recentPastEvent ? (
        <section className="section post-event-panel reveal">
          <div>
            <p className="section-kicker">POST SHOW SIGNAL</p>
            <h2>{recentPastEvent.name}</h2>
            <p>Después del evento puedes publicar fotos, set grabado y badges desbloqueables para que la experiencia no termine en la pista.</p>
          </div>
          <div className="live-command-actions">
            <Link className="button secondary" href="/media"><Camera /> Fotos</Link>
            <Link className="button secondary" href="/musica"><Radio /> Set</Link>
            <Link className="button primary" href="/perfil"><Sparkles /> Badge</Link>
          </div>
        </section>
      ) : null}

      <section className="quick-paths section reveal world-paths">
        <p className="section-kicker">IAMJOSHWA WORLD</p>
        <div className="path-grid immersive-paths">
          <Link href="/musica">
            <Headphones />
            <div>
              <h2>Listen</h2>
              <p>Sets, releases, player global y dirección sonora.</p>
            </div>
            <ArrowRight />
          </Link>
          <Link href="/booking">
            <Ticket />
            <div>
              <h2>Book Now</h2>
              <p>Flujo serio para promotores: booking, EPK y contacto.</p>
            </div>
            <ArrowRight />
          </Link>
          <Link href="/acceso">
            <Sparkles />
            <div>
              <h2>Pass</h2>
              <p>Inner Circle, puntos, badges, QR y The Vault.</p>
            </div>
            <ArrowRight />
          </Link>
        </div>
      </section>

      {nextSignal ? (
        <section className="section next-signal-panel reveal">
          <div>
            <p className="section-kicker">NEXT SIGNAL</p>
            <h2>{nextSignal.title}</h2>
            <p>{nextSignal.subtitle}</p>
          </div>
          <div>
            <Countdown
              targetDate={nextSignal.targetDate}
              type={nextSignal.type}
              label={nextSignal.label}
              compact
              source="home_next_signal"
              contentId={nextSignal.id}
              contentType={nextSignal.type}
              completedLabel="SIGNAL UPDATED"
              completedTitle="Buscando la siguiente señal"
            />
            <Link className="button secondary" href={nextSignal.href}>
              Open signal <ArrowRight />
            </Link>
          </div>
        </section>
      ) : null}

      {signal ? (
        <section className="section personalized-feed reveal">
          <div>
            <p className="section-kicker">YOUR SIGNAL</p>
            <h2>Tu feed está listo.</h2>
            <p>
              {signal.city ? `${signal.city} · ` : ""}
              {signal.favoriteProject.toUpperCase()} primero · {signal.wantsShows ? "Shows" : "Shows off"} / {signal.wantsSets ? "Sets" : "Sets off"} / {signal.wantsReleases ? "Releases" : "Releases off"}
            </p>
          </div>
          {signal.favoriteProject !== universe ? (
            <button className="button secondary" onClick={() => setUniverse(signal.favoriteProject)}>
              Cambiar a {signal.favoriteProject.toUpperCase()}
            </button>
          ) : (
            <Link className="button secondary" href="/perfil">Ver mi Pass</Link>
          )}
        </section>
      ) : null}

      {isVisible(managed, "next_event") ? (
        event ? (
          <section className="section split-feature cinematic-section reveal">
            <div>
              <p className="section-kicker">NEXT SIGNAL · {event.status}</p>
              <h2>{event.name}</h2>
              <p>{event.city} · {event.venue}</p>
              <Countdown
                targetDate={event.date}
                type={event.universe === "afterluv" ? "afterluv" : "show"}
                label={event.universe === "afterluv" ? "TRANSMISSION BEGINS IN" : "NEXT SHOW"}
                title={`${event.city} · ${event.venue}`}
                compact
                source="home_next_event"
                contentId={event.id}
                contentType="show"
              />
              <div className="inline-actions">
                <Link className="button primary" href={`/fechas/${event.slug}`}>Open show</Link>
                {event.ticketUrl ? <a className="button secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">Tickets</a> : null}
              </div>
            </div>
            <div className="poster-card premium-poster">
              <span>{universe === "afterluv" ? "AL//LIVE" : "IJ//LIVE"}</span>
              <strong>{new Date(event.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).toUpperCase()}</strong>
              <small>{event.venue}</small>
            </div>
          </section>
        ) : (
          <EmptySection kicker="NEXT SIGNAL" title="COMING SOON" body="La próxima transmisión oficial todavía no fue revelada. Mantén el Pass activo para recibir la primera señal." ctaHref="/fechas" ctaLabel="Ver shows" />
        )
      ) : null}

      {isVisible(managed, "featured_set") ? (
        <section className="section cards-section reveal">
          <div className="section-heading">
            <div>
              <p className="section-kicker">NOW PLAYING</p>
              <h2>Sound in motion</h2>
            </div>
            <Link className="text-link" href="/musica">Open music <ArrowRight /></Link>
          </div>
          {set || release ? (
            <div className="feature-cards cinematic-cards">
              {set ? (
                <article className="home-audio-feature">
                  <div className="art art-set waveform-art">{set.category}</div>
                  <span>FEATURED SET</span>
                  <h3>{set.title}</h3>
                  <p>{set.duration} · {set.genres.join(" / ")}</p>
                  {set.demo ? (
                    <Link href="/musica">Open library</Link>
                  ) : (
                    <button type="button" onClick={startSet} disabled={!set.audioUrl && !set.embedUrl && !set.externalUrl}>
                      <Radio /> {!set.audioUrl && !set.embedUrl && set.externalUrl ? "Open platform" : "Start global player"}
                    </button>
                  )}
                </article>
              ) : null}
              {release ? (
                <article>
                  <div className="art art-release">NEW<br />MUSIC</div>
                  <span>RELEASE</span>
                  <h3>{release.title}</h3>
                  <p>{release.type}</p>
                  <Link href={`/lanzamientos/${release.slug}`}>Open release</Link>
                </article>
              ) : null}
            </div>
          ) : (
            <EmptySection kicker="NEW SOUND" title="INCOMING" body="La siguiente señal sonora está en preparación. Entra a Música para activar el player cuando el drop esté disponible." ctaHref="/musica" ctaLabel="Abrir música" />
          )}
        </section>
      ) : null}

      <section className="section home-pass-spotlight reveal">
        <div className="home-pass-card" data-project={universe}>
          <span>IAMJOSHWA PASS</span>
          <strong>INNER<br />CIRCLE</strong>
          <small>LEVEL 01 — LISTENER · QR ACCESS · THE VAULT</small>
        </div>
        <div>
          <p className="section-kicker">PASS / QUESTS / VAULT</p>
          <h2>El sitio no solo se visita. Se desbloquea.</h2>
          <p>El Pass conecta perfil, puntos, badges, QR, misiones, referidos y contenido exclusivo. Ideal para convertir fans casuales en comunidad real.</p>
          <div className="inline-actions">
            <Link className="button primary" href="/acceso">Create Pass</Link>
            <Link className="button secondary" href="/comunidad">Cómo funciona</Link>
          </div>
        </div>
      </section>

      <section className="section home-missions reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">MISSIONS</p>
            <h2>Primeras acciones.</h2>
          </div>
          <Link className="text-link" href="/perfil">Open Pass <ArrowRight /></Link>
        </div>
        <div className="mission-grid">
          {missions.map(([number, titleValue, copy, href]) => (
            <Link href={href} key={number}>
              <span>{number}</span>
              <strong>{titleValue}</strong>
              <p>{copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section home-vault-tease reveal">
        <div>
          <p className="section-kicker">THE VAULT</p>
          <h2>Locked drops. Secret codes. Private signals.</h2>
          <p>Demos, edits, WAV previews, sets privados y recompensas pueden vivir detrás de puntos, códigos o acceso manual.</p>
          <Link className="button primary" href="/the-vault">Enter The Vault</Link>
        </div>
        <div className="locked-drop-grid" aria-label="Drops bloqueados de muestra visual">
          {["DEMO", "EDIT", "AFTER"].map((item, index) => (
            <article key={item}>
              <LockKeyhole />
              <strong>{item}</strong>
              <span>{index === 0 ? "CODE REQUIRED" : index === 1 ? "POINTS REQUIRED" : "AFTERLUV ONLY"}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="newsletter section cinematic-contact reveal" id="community-email">
        <span className="section-kicker">INNER CIRCLE</span>
        <h2>Enter the signal.</h2>
        <p>Shows, music, missions and secret drops with consent.</p>
        <Link className="button primary" href="/acceso">Create IAMJOSHWA Pass</Link>
      </section>
    </>
  );
}

function isVisible(sections: PageSectionItem[], type: string) {
  return !sections.length || sections.some((item) => item.blockType === type);
}

function isLiveWindow(value: string, now: number) {
  const time = dateToTime(value);
  if (!time) return false;
  const startsIn = time - now;
  const endedAgo = now - time;
  return startsIn <= 18 * 60 * 60 * 1000 && endedAgo <= 8 * 60 * 60 * 1000;
}

function isRecentPastEvent(value: string, now: number) {
  const time = dateToTime(value);
  if (!time || time > now) return false;
  return now - time <= 5 * 24 * 60 * 60 * 1000;
}

function EmptySection({ kicker, title, body, ctaHref, ctaLabel }: { kicker?: string; title: string; body: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="admin-empty public-empty branded-empty">
      <Radio />
      {kicker ? <span>{kicker}</span> : null}
      <h2>{title}</h2>
      <p>{body}</p>
      {ctaHref ? <Link className="button secondary" href={ctaHref}>{ctaLabel || "Abrir"}</Link> : null}
    </div>
  );
}

export function FilteredList({ kind, items }: { kind: "events" | "sets" | "releases"; items: EventItem[] | SetItem[] | ReleaseItem[] }) {
  const { universe } = useUniverse();
  const filtered = items.filter((item) => item.universe === universe);

  if (!filtered.length) {
    const empty = kind === "events"
      ? ["NEXT SIGNAL", "COMING SOON", "La próxima transmisión oficial todavía no fue revelada."]
      : kind === "sets"
        ? ["NEW SOUND", "INCOMING", "La siguiente sesión está entrando al sistema. No hay autoplay."]
        : ["NEXT DROP", "LOADING", "El siguiente lanzamiento está en cola de publicación."];
    return <EmptySection kicker={empty[0]} title={empty[1]} body={empty[2]} />;
  }

  if (kind === "events") {
    return (
      <div className="list-grid">
        {(filtered as EventItem[]).map((item) => (
          <article className="list-card" key={item.id}>
            <span className="demo-chip">{item.status}</span>
            <p className="date-block">{new Date(item.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <h2>{item.name}</h2>
            <p>{item.venue}<br />{item.city}, {item.country}</p>
            <div className="tag-row">{item.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            <Link className="button secondary" href={`/fechas/${item.slug}`}>Ver detalles <ArrowRight /></Link>
          </article>
        ))}
      </div>
    );
  }

  if (kind === "sets") {
    return (
      <div className="list-grid">
        {(filtered as SetItem[]).map((item) => (
          <article className="list-card" key={item.id}>
            <div className="art art-set">{item.category}</div>
            <h2>{item.title}</h2>
            <p>{item.location} · {item.duration} · {item.bpm} BPM</p>
            <div className="tag-row">{item.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            {item.externalUrl ? <a className="button primary" href={item.externalUrl} target="_blank" rel="noreferrer">Escuchar</a> : <span className="muted">Platform link queued</span>}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="list-grid">
      {(filtered as ReleaseItem[]).map((item) => {
        const future = new Date(item.releaseAt) > new Date();
        const url = future ? item.presaveUrl : item.listenUrl;
        return (
          <article className="list-card" key={item.id}>
            <div className="art art-release">{item.title}</div>
            <span className="demo-chip">{future ? "PRÓXIMAMENTE" : "DISPONIBLE"}</span>
            <h2>{item.title}</h2>
            <p>{item.story}</p>
            {future ? <Countdown date={item.releaseAt} /> : null}
            {url ? <a className="button secondary" href={url} target="_blank" rel="noreferrer">{future ? "Haz pre-save" : "Escuchar ahora"}</a> : <span className="muted">Platform links queued</span>}
          </article>
        );
      })}
    </div>
  );
}
