"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Camera, Disc3, Gift, Headphones, LockKeyhole, MapPin, Play, QrCode, Radio, Signal, Sparkles, Ticket, Zap } from "lucide-react";
import { Countdown } from "./countdown";
import { EventShareStudio } from "./event-share-studio";
import { usePlayer } from "./player-provider";
import { useUniverse } from "./universe-provider";
import { dateToTime, formatMxDate, formatMxTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { createLabelGetter } from "@/lib/cms/labels";
import { isSupabaseConfigured } from "@/lib/env";
import type { ArtistProfileItem, EventItem, PageSectionItem, ReleaseItem, RewardItem, SetItem, Universe } from "@/types/content";

const fallback: Record<Universe, ArtistProfileItem> = {
  iamjoshwa: {
    project: "iamjoshwa",
    displayName: "IAMJOSHWA",
    subtitle: "DJ & Producer",
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
  labels?: Record<string, string>;
  now: number;
};

type PersonalSignal = {
  city: string | null;
  favoriteProject: Universe;
  wantsShows: boolean;
  wantsSets: boolean;
  wantsReleases: boolean;
};

const missions = [
  ["01", "Listen to your first set", "Activa el player global y empieza tu historial musical.", "/musica"],
  ["02", "Complete your Pass", "Alias, ciudad, géneros y preferencias listas.", "/perfil"],
  ["03", "Enter The Vault", "Explora drops, códigos y recompensas bloqueadas.", "/the-vault"],
  ["04", "Book / Share", "Promotores encuentran EPK, contacto y booking en segundos.", "/booking"],
] as const;

const EVENT_TAKEOVER_LEAD_MS = 6 * 60 * 60 * 1000;
const DEFAULT_EVENT_DURATION_MS = 6 * 60 * 60 * 1000;

type HomeSignalCard = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  href: string;
  action: string;
  icon: "listen" | "show" | "drop" | "pass" | "mission" | "vault";
  state: "live" | "active" | "soon" | "locked";
  imageUrl?: string;
  meta?: string;
  primary?: boolean;
};

export function HomeContent({ events, sets, releases, rewards = [], artists = [], sections = [], labels = {}, now }: Props) {
  const { universe, setUniverse } = useUniverse();
  const { play } = usePlayer();
  const label = createLabelGetter(labels);
  const [signal, setSignal] = useState<PersonalSignal | null>(null);
  const [currentTime, setCurrentTime] = useState(() => normalizeNow(now));
  const artist = artists.find((item) => item.project === universe) || fallback[universe];
  const managed = sections.filter((item) => !item.project || item.project === universe);
  const hero = managed.find((item) => item.blockType === "hero")?.content || {};

  const scopedEvents = useMemo(() => events.filter((item) => item.universe === universe).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events, universe]);
  const scopedSets = useMemo(() => sets.filter((item) => item.universe === universe), [sets, universe]);
  const scopedReleases = useMemo(() => releases.filter((item) => item.universe === universe), [releases, universe]);
  const rewardCount = useMemo(() => rewards.filter((item) => !item.project || item.project === universe).length, [rewards, universe]);
  const takeoverEvent = scopedEvents.find((item) => isEventTakeoverWindow(item, currentTime)) || null;
  const event = scopedEvents.find((item) => !isInactiveEvent(item) && getEventEndTime(item) > currentTime) || takeoverEvent || scopedEvents[0];
  const liveEvent = takeoverEvent && isLiveWindow(takeoverEvent, currentTime) ? takeoverEvent : null;
  const hasTakeoverEvent = Boolean(takeoverEvent);
  const recentPastEvent = scopedEvents.filter((item) => isRecentPastEvent(item, currentTime)).sort((a, b) => getEventEndTime(b) - getEventEndTime(a))[0];
  const release = scopedReleases[0];
  const set = scopedSets[0];
  const signalFeed = useMemo<HomeSignalCard[]>(() => {
    const nextEvent = scopedEvents.find((item) => !isInactiveEvent(item) && getEventEndTime(item) > currentTime);
    const latestTransmission = set || release;
    return [
      {
        id: "now-playing",
        kicker: "NOW",
        title: latestTransmission?.title || "NEXT TRANSMISSION",
        body: set
          ? `${set.category} · ${set.duration || "Set oficial"} · ${set.genres.slice(0, 2).join(" / ") || "Club signal"}`
          : release
            ? `${release.type} · ${new Date(release.releaseAt).getTime() > currentTime ? "Pre-save active" : "Available now"}`
            : "New music incoming.",
        href: set ? `/musica/${set.slug}` : release ? `/lanzamientos/${release.slug}` : "/musica",
        action: latestTransmission ? "Play" : "Open archive",
        icon: set ? "listen" : "drop",
        state: latestTransmission ? "active" : "soon",
        imageUrl: set?.coverUrl || release?.coverUrl,
        meta: set ? "DJ SET" : release ? "RELEASE" : "ARCHIVE",
        primary: true,
      },
      {
        id: "next-event",
        kicker: liveEvent ? "SIGNAL LIVE" : hasTakeoverEvent ? "LIVE TONIGHT" : "NEXT",
        title: nextEvent?.name || "NEXT TRANSMISSION",
        body: nextEvent ? `${formatMxDate(nextEvent.date, { day: "2-digit", month: "short" }).toUpperCase()} · ${nextEvent.venue} · ${nextEvent.city}` : "Next show incoming.",
        href: nextEvent ? `/fechas/${nextEvent.slug}` : "/fechas",
        action: nextEvent ? "Get info" : "Shows",
        icon: "show",
        state: liveEvent || hasTakeoverEvent ? "live" : nextEvent ? "active" : "soon",
        imageUrl: nextEvent?.flyerUrl,
        meta: nextEvent ? "SHOW" : "SCHEDULE",
      },
      {
        id: "world",
        kicker: "WORLD",
        title: "ENTER IAMJOSHWA WORLD",
        body: "Pass, missions, Vault files, shows and secret drops in one digital universe.",
        href: signal ? "/perfil" : "/comunidad",
        action: "Enter world",
        icon: "pass",
        state: "active",
        meta: "ECOSYSTEM",
      },
    ];
  }, [currentTime, hasTakeoverEvent, liveEvent, release, scopedEvents, set, signal]);

  const title = String(hero.title || artist.displayName);
  const tagline = String(hero.subtitle || artist.tagline);
  const heroMediaUrl = typeof hero.media_url === "string" ? hero.media_url : "";
  const heroIsVideo = typeof hero.media_mime_type === "string" && hero.media_mime_type.startsWith("video/");
  const heroStyle = {
    "--hero-bg": !heroIsVideo && heroMediaUrl ? `url(${heroMediaUrl})` : artist.heroDesktopUrl ? `url(${artist.heroDesktopUrl})` : undefined,
    "--hero-mobile-bg": artist.heroMobileUrl ? `url(${artist.heroMobileUrl})` : undefined,
  } as CSSProperties;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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
        <section className={`hero cinematic-hero world-hero ${takeoverEvent ? "has-event-takeover" : ""}`} style={heroStyle}>
          {heroIsVideo ? <video className="hero-video" src={heroMediaUrl} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" /> : null}
          <div className="cinema-depth" />
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-grid" />
          {takeoverEvent ? (
            <EventTakeoverHero event={takeoverEvent} live={Boolean(liveEvent)} universe={universe} />
          ) : (
            <div className="hero-content world-hero-content reveal is-visible">
              {artist.logoUrl ? <Image className="hero-logo" src={artist.logoUrl} alt={`${artist.displayName} logo`} width={420} height={160} priority /> : null}
              <p className="eyebrow">{universe === "afterluv" ? "AFTERLUV SIGNAL" : "IAMJOSHWA WORLD"}</p>
              <h1>{title}</h1>
              <p className="hero-tagline">{tagline}</p>
              <div className="hero-actions">
                <Link className="button primary hero-main-cta" href="/musica">
                  <Play /> Listen
                </Link>
                <Link className="button secondary" href="/booking">
                  {label("booking.cta", "Book Now")}
                </Link>
                <Link className="button secondary world-entry-cta" href="/comunidad">
                  <Sparkles /> Enter World
                </Link>
              </div>
            </div>
          )}
          <div className="scroll-note">Scroll<span /></div>
        </section>
      ) : null}

      {takeoverEvent ? (
        <section className="section live-tonight-panel event-command-panel reveal is-visible" data-mode={liveEvent ? "live" : "tonight"}>
          <div>
            <p className="section-kicker">{liveEvent ? "SIGNAL LIVE" : "LIVE TONIGHT"}</p>
            <h2>{takeoverEvent.name}</h2>
            <p>{takeoverEvent.city} · {takeoverEvent.venue} · Set {takeoverEvent.setTime || formatMxTime(takeoverEvent.date)} MX</p>
            <div className="event-command-metrics" aria-label="Resumen rápido del evento">
              <span><strong>{liveEvent ? "LIVE" : "TONIGHT"}</strong><small>Estado</small></span>
              <span><strong>{takeoverEvent.city}</strong><small>Ciudad</small></span>
              <span><strong>{takeoverEvent.setTime || formatMxTime(takeoverEvent.date)}</strong><small>Set MX</small></span>
              <span><strong>{takeoverEvent.endDate ? formatMxTime(takeoverEvent.endDate) : "Fin TBC"}</strong><small>Finaliza</small></span>
            </div>
          </div>
          <div className="live-command-actions">
            {eventAccess(takeoverEvent).href ? <a className="button primary" href={eventAccess(takeoverEvent).href} target="_blank" rel="noreferrer"><Ticket /> {eventAccess(takeoverEvent).label}</a> : <Link className="button primary" href={`/fechas/${takeoverEvent.slug}`}><Ticket /> {eventAccess(takeoverEvent).label}</Link>}
            {takeoverEvent.mapUrl ? <a className="button secondary" href={takeoverEvent.mapUrl} target="_blank" rel="noreferrer"><MapPin /> Mapa</a> : null}
            <Link className="button secondary pass-live-command" href="/checkin"><QrCode /> Código check-in</Link>
            <Link className="button secondary" href={`/fechas/${takeoverEvent.slug}`}><CalendarDays /> Info completa</Link>
          </div>
          <EventShareStudio event={takeoverEvent} compact />
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

      <section className="section home-signal-feed reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">LATEST TRANSMISSION</p>
            <h2>{label("home.signalFeed.title", "Now, next and the entrance to IAMJOSHWA World.")}</h2>
          </div>
          <Link className="text-link" href={signal ? "/perfil" : "/acceso?next=%2Fperfil"}>
            {signal ? "Open my Pass" : "Create Pass"} <ArrowRight />
          </Link>
        </div>
        <div className="signal-feed-grid">
          {signalFeed.map((item) => (
            <Link className={`signal-feed-card ${item.primary ? "is-primary" : ""}`} data-state={item.state} href={item.href} key={item.id}>
              {item.imageUrl ? (
                <div className="signal-feed-art" aria-hidden="true">
                  <Image src={item.imageUrl} alt="" fill sizes={item.primary ? "(max-width: 760px) 86vw, 34vw" : "(max-width: 760px) 78vw, 20vw"} />
                </div>
              ) : null}
              <div className="signal-feed-icon">
                <SignalIcon type={item.icon} />
                <span>{item.kicker}</span>
              </div>
              {item.meta ? <em>{item.meta}</em> : null}
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <strong>{item.action}<ArrowRight /></strong>
            </Link>
          ))}
        </div>
      </section>

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
                {eventAccess(event).href ? <a className="button secondary" href={eventAccess(event).href} target="_blank" rel="noreferrer">{eventAccess(event).label}</a> : null}
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
          <Link href="/the-vault">
            <LockKeyhole />
            <div>
              <h2>The Vault</h2>
              <p>Archivo secreto, drops, códigos y contenido desbloqueable.</p>
            </div>
            <ArrowRight />
          </Link>
          <Link href="/acceso">
            <Sparkles />
            <div>
              <h2>Josh Pass</h2>
              <p>Inner Circle, puntos, badges, QR y misiones.</p>
            </div>
            <ArrowRight />
          </Link>
          <Link href="/booking">
            <Ticket />
            <div>
              <h2>Book / EPK</h2>
              <p>Ruta directa para promotores, press kit y contrataciones.</p>
            </div>
            <ArrowRight />
          </Link>
        </div>
      </section>

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
          <p className="section-kicker">{label("nav.vault", "THE VAULT")}</p>
          <h2>{label("vault.locked", "Locked drops. Secret codes. Private signals.")}</h2>
          <p>{rewardCount ? `${rewardCount} recompensas y archivos pueden vivir detrás de puntos, códigos o acceso manual.` : "Demos, edits, WAV previews, sets privados y recompensas pueden vivir detrás de puntos, códigos o acceso manual."}</p>
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

      {isVisible(managed, "featured_set") ? (
        <section className="section cards-section reveal music-archive-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">MUSIC ARCHIVE</p>
              <h2>Official releases and DJ sets.</h2>
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

      <section className="section home-pro-links reveal" aria-label="Comunidad, EPK y booking">
        <Link href="/comunidad">
          <span>COMMUNITY / SOCIAL</span>
          <strong>Enter the Inner Circle</strong>
          <small>Pass, rewards, social links and fan activity.</small>
        </Link>
        <Link href="/epk">
          <span>EPK</span>
          <strong>Press kit for promoters</strong>
          <small>Bio, photos, music links, riders and assets.</small>
        </Link>
        <Link href="/booking">
          <span>BOOKING</span>
          <strong>Professional contact flow</strong>
          <small>Request a date, send event details and access EPK.</small>
        </Link>
      </section>

      <section className="newsletter section cinematic-contact reveal" id="community-email">
        <span className="section-kicker">INNER CIRCLE</span>
        <h2>Enter the signal.</h2>
        <p>Shows, music, missions and secret drops with consent.</p>
        <Link className="button primary" href="/acceso">{label("pass.join", "Create IAMJOSHWA Pass")}</Link>
      </section>
    </>
  );
}

function SignalIcon({ type }: { type: HomeSignalCard["icon"] }) {
  if (type === "listen") return <Headphones />;
  if (type === "show") return <CalendarDays />;
  if (type === "drop") return <Disc3 />;
  if (type === "pass") return <Sparkles />;
  if (type === "mission") return <Zap />;
  if (type === "vault") return <Gift />;
  return <Signal />;
}

function eventAccess(event: EventItem) {
  if (event.ticketMode === "registration") return event.registrationUrl ? { label: "Registro", href: event.registrationUrl } : { label: "Registro pronto" };
  if (event.ticketMode === "free") return { label: "Entrada gratuita" };
  if (event.ticketMode === "none") return { label: "Detalles" };
  return event.ticketUrl ? { label: "Boletos", href: event.ticketUrl } : { label: "Detalles" };
}

function EventTakeoverHero({ event, live, universe }: { event: EventItem; live: boolean; universe: Universe }) {
  const dateLabel = formatMxDate(event.date, { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  const timeLabel = event.setTime || `${formatMxTime(event.date)} MX`;
  const access = eventAccess(event);

  return (
    <div className="hero-content world-hero-content event-takeover-hero reveal is-visible">
      <div className="event-takeover-copy">
        <div className="event-live-ribbon" aria-label={live ? "Evento en vivo" : "Evento esta noche"}>
          <span className="event-live-dot" />
          <strong>{live ? "SIGNAL LIVE" : "LIVE TONIGHT"}</strong>
          <small>{dateLabel} · {timeLabel}</small>
        </div>
        <p className="eyebrow">{universe === "afterluv" ? "AFTERLUV TRANSMISSION" : "IAMJOSHWA PRESENTS"}</p>
        <h1>{event.name}</h1>
        <p className="hero-tagline">{event.venue} · {event.city}. Toda la señal de hoy apunta a esta noche.</p>
        <div className="event-takeover-countdown">
          <Countdown
            targetDate={event.date}
            type={event.universe === "afterluv" ? "afterluv" : "show"}
            label={live ? "ON STAGE SIGNAL" : "STARTS IN"}
            title={`${event.city} · ${event.venue}`}
            compact
            source="home_event_takeover"
            contentId={event.id}
            contentType="show"
            completedLabel="SIGNAL LIVE"
            completedTitle={event.name}
          />
        </div>
        <div className="hero-actions event-takeover-actions">
          {access.href ? (
            <a className="button primary hero-main-cta" href={access.href} target="_blank" rel="noreferrer">
              <Ticket /> {access.label}
            </a>
          ) : (
            <Link className="button primary hero-main-cta" href={`/fechas/${event.slug}`}>
              <Ticket /> {access.label}
            </Link>
          )}
          {event.mapUrl ? (
            <a className="button secondary" href={event.mapUrl} target="_blank" rel="noreferrer">
              <MapPin /> Open map
            </a>
          ) : null}
          <Link className="button secondary pass-live-command" href="/checkin">
            <QrCode /> Check-in code
          </Link>
          <Link className="button secondary" href={`/fechas/${event.slug}`}>
            <CalendarDays /> Full info
          </Link>
        </div>
        <div className="hero-signal-row event-signal-row" aria-label="Información rápida del evento">
          <span>{event.status}</span>
          <span>{event.age}</span>
          <span>{event.priceLabel}</span>
          <span>{event.genres.slice(0, 2).join(" / ") || "CLUB SIGNAL"}</span>
        </div>
      </div>
      <Link className="event-takeover-flyer" href={`/fechas/${event.slug}`} aria-label={`Abrir evento ${event.name}`}>
        {event.flyerUrl ? (
          <Image src={event.flyerUrl} alt={`Flyer de ${event.name}`} fill priority sizes="(max-width: 760px) 78vw, 28vw" />
        ) : (
          <span>{event.universe.toUpperCase()}</span>
        )}
        <div>
          <strong>{live ? "LIVE" : "TONIGHT"}</strong>
          <small>{event.city} · {timeLabel}</small>
        </div>
      </Link>
    </div>
  );
}

function isVisible(sections: PageSectionItem[], type: string) {
  return !sections.length || sections.some((item) => item.blockType === type);
}

function isInactiveEvent(event: EventItem) {
  return event.status === "Cancelado" || event.status === "Finalizado";
}

function normalizeNow(value: number) {
  return Number.isFinite(value) && value > 0 ? value : Date.now();
}

function getEventStartTime(event: EventItem) {
  return dateToTime(event.date) || 0;
}

function getEventEndTime(event: EventItem) {
  const start = getEventStartTime(event);
  if (!start) return 0;
  const configuredEnd = event.endDate ? dateToTime(event.endDate) : 0;
  return configuredEnd && configuredEnd > start ? configuredEnd : start + DEFAULT_EVENT_DURATION_MS;
}

function isEventTakeoverWindow(event: EventItem, now: number) {
  if (isInactiveEvent(event)) return false;
  const start = getEventStartTime(event);
  const end = getEventEndTime(event);
  if (!start || !end) return false;
  return now >= start - EVENT_TAKEOVER_LEAD_MS && now < end;
}

function isLiveWindow(event: EventItem, now: number) {
  const start = getEventStartTime(event);
  const end = getEventEndTime(event);
  if (!start || !end) return false;
  return now >= start && now < end;
}

function isRecentPastEvent(event: EventItem, now: number) {
  if (isInactiveEvent(event)) return false;
  const end = getEventEndTime(event);
  if (!end || end > now) return false;
  return now - end <= 5 * 24 * 60 * 60 * 1000;
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
