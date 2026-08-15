import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  AudioWaveform,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  HardDrive,
  ImagePlus,
  Music2,
  Palette,
  Sparkles,
  Ticket,
  Upload,
} from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { formatMxDateTime } from "@/lib/dates";

export default async function AdminDashboard() {
  const { supabase } = await requireRole(["editor", "admin"]);
  const now = new Date().toISOString();
  const [
    events,
    releases,
    newBooking,
    totalBooking,
    profiles,
    checkins,
    subscribers,
    media,
    archivedMedia,
    unusedMediaRows,
    drafts,
    schedules,
    profileCities,
    releaseLinkRows,
    eventsMissingFlyer,
    setsMissingCover,
    setsMissingAudio,
    releasesMissingCover,
    artistsMissingMobile,
    setOpens,
    platformClicks,
    presaveClicks,
    ticketClicks,
  ] = await Promise.all([
    supabase.from("events").select("id,name,starts_at,event_status").gte("starts_at", now).not("event_status", "in", "(cancelled,completed)").order("starts_at").limit(1),
    supabase.from("releases").select("id,name,releases_at").gte("releases_at", now).order("releases_at").limit(1),
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("booking_requests").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("event_checkins").select("id", { count: "exact", head: true }),
    supabase.from("current_notification_consents").select("id", { count: "exact", head: true }).eq("channel", "email").eq("granted", true),
    supabase.from("media_assets").select("id,byte_size", { count: "exact" }).is("archived_at", null).limit(500),
    supabase.from("media_assets").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    supabase.from("media_assets").select("id,display_name").is("archived_at", null).limit(500),
    supabase.from("page_sections").select("id", { count: "exact", head: true }).eq("publication_status", "draft"),
    supabase.from("publication_schedule").select("id,error", { count: "exact" }).is("executed_at", null),
    supabase.from("profiles").select("city").not("city", "is", null).limit(1000),
    supabase.from("releases").select("id,name,publication_status,release_links(id)").eq("publication_status", "published").limit(50),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("publication_status", "published").is("flyer_asset_id", null),
    supabase.from("sets").select("id", { count: "exact", head: true }).eq("publication_status", "published").is("cover_asset_id", null),
    supabase.from("sets").select("id", { count: "exact", head: true }).eq("publication_status", "published").eq("access_level", "public").is("audio_asset_id", null).is("soundcloud_url", null).is("youtube_url", null).is("mixcloud_url", null).is("external_url", null),
    supabase.from("releases").select("id", { count: "exact", head: true }).eq("publication_status", "published").is("cover_asset_id", null),
    supabase.from("artist_profiles").select("id", { count: "exact", head: true }).eq("status", "published").is("hero_mobile_asset_id", null),
    supabase.from("points_ledger").select("id", { count: "exact", head: true }).eq("source_type", "open_set"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).in("action", ["public_platform_click", "public_set_platform_click", "public_release_listen_click"]),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "public_presave_click"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "public_ticket_click"),
  ]);

  const usageRows = await supabase.from("media_usage").select("asset_id").in("asset_id", (unusedMediaRows.data || []).map((item) => item.id));
  const usedIds = new Set((usageRows.data || []).map((item) => item.asset_id));
  const unusedMedia = (unusedMediaRows.data || []).filter((item) => !usedIds.has(item.id)).length;
  const mediaSizeMb = ((media.data || []).reduce((sum, item) => sum + Number(item.byte_size || 0), 0) / 1024 / 1024).toFixed(1);

  const cities = Object.entries((profileCities.data || []).reduce<Record<string, number>>((acc, row) => {
    const city = String(row.city || "").trim();
    if (city) acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const releaseMissingLinks = (releaseLinkRows.data || []).filter((item) => !Array.isArray(item.release_links) || item.release_links.length === 0).length;
  const scheduleErrors = (schedules.data || []).filter((item) => item.error).length;
  const blockingAlerts = releaseMissingLinks + (eventsMissingFlyer.count || 0) + (setsMissingCover.count || 0) + (setsMissingAudio.count || 0) + (releasesMissingCover.count || 0) + (artistsMissingMobile.count || 0) + scheduleErrors;
  const maintenanceAlerts = unusedMedia;
  const alerts = blockingAlerts + maintenanceAlerts;
  const checklist = [
    ["Lanzamientos publicados sin links", releaseMissingLinks, "/admin/lanzamientos"],
    ["Eventos publicados sin flyer", eventsMissingFlyer.count || 0, "/admin/eventos"],
    ["Sets publicados sin portada", setsMissingCover.count || 0, "/admin/sets"],
    ["Sets públicos sin audio/player", setsMissingAudio.count || 0, "/admin/sets"],
    ["Lanzamientos sin portada", releasesMissingCover.count || 0, "/admin/lanzamientos"],
    ["Heroes sin imagen móvil", artistsMissingMobile.count || 0, "/admin/configuracion"],
    ["Publicaciones programadas con error", scheduleErrors, "/admin/portada"],
    ["Archivos sin uso detectado", unusedMedia, "/admin/media"],
  ];
  const quick = [
    ["Subir media", "/admin/media", <Upload key="upload" />, "Carga audio, portadas, flyers, logos y fotos."],
    ["Cambiar portada", "/admin/configuracion", <Palette key="palette" />, "Edita hero, identidad visual y biografías."],
    ["Nuevo evento", "/admin/eventos/nuevo", <CalendarPlus key="calendar" />, "Crea fecha, flyer y link de boletos."],
    ["Nuevo set", "/admin/sets/nuevo", <Music2 key="music" />, "Publica portada, player y tracklist."],
    ["Booking", "/admin/booking", <Ticket key="ticket" />, "Revisa solicitudes de contratación."],
    ["Media pública", "/media", <ImagePlus key="image" />, "Mira cómo se ve la galería."],
  ];

  return (
    <>
      <header className="admin-hero">
        <div>
          <span className="section-kicker">CONTROL CENTRAL</span>
          <h1>Admin IAMJOSHWA</h1>
          <p>Todo lo que cambies aquí alimenta la página pública sin tocar código. Este panel ahora te avisa qué falta para publicar con calidad profesional.</p>
        </div>
        <Link className="button primary" href="/admin/media"><Upload />Subir media</Link>
      </header>

      <section className="admin-quick-actions">
        {quick.map(([label, href, icon, copy]) => (
          <Link href={String(href)} key={String(label)}>
            <span>{icon}</span>
            <strong>{String(label)}</strong>
            <small>{String(copy)}</small>
          </Link>
        ))}
      </section>

      <section className="admin-stats">
        <article><span>REGISTROS</span><strong>{profiles.count || 0}</strong></article>
        <article><span>SUSCRIPTORES</span><strong>{subscribers.count || 0}</strong></article>
        <article><span>BOOKING NUEVO</span><strong>{newBooking.count || 0}</strong></article>
        <article><span>CHECK-INS</span><strong>{checkins.count || 0}</strong></article>
        <article><span>ARCHIVOS</span><strong>{media.count || 0}</strong></article>
        <article><span>MEDIA MB</span><strong>{mediaSizeMb}</strong></article>
        <article><span>BORRADORES HOME</span><strong>{drafts.count || 0}</strong></article>
        <article><span>ALERTAS</span><strong>{alerts}</strong></article>
        <article><span>SETS ABIERTOS</span><strong>{setOpens.count || 0}</strong></article>
        <article><span>CLICKS PLATAFORMA</span><strong>{platformClicks.count || 0}</strong></article>
        <article><span>PRE-SAVES</span><strong>{presaveClicks.count || 0}</strong></article>
        <article><span>CLICKS BOLETOS</span><strong>{ticketClicks.count || 0}</strong></article>
      </section>

      <section className="admin-analytics-strip">
        <article>
          <AudioWaveform />
          <span>Music analytics</span>
          <strong>{setOpens.count || 0}</strong>
          <small>aperturas de sets registradas con usuarios logueados</small>
        </article>
        <article>
          <BarChart3 />
          <span>Conversiones</span>
          <strong>{(platformClicks.count || 0) + (presaveClicks.count || 0) + (ticketClicks.count || 0)}</strong>
          <small>clicks medidos en plataformas, pre-saves y boletos</small>
        </article>
      </section>

      <section className={`admin-health-card ${blockingAlerts ? "needs-work" : "is-ready"}`}>
        <div>
          {blockingAlerts ? <AlertTriangle /> : <CheckCircle2 />}
          <div>
            <span>{blockingAlerts ? "REVISIÓN ANTES DE PUBLICAR" : "LISTO PARA PUBLICAR"}</span>
            <h2>{blockingAlerts ? `${blockingAlerts} detalles críticos por corregir` : "Tu contenido público no tiene alertas críticas."}</h2>
            <p>{blockingAlerts ? "Corrige links, portadas, flyers, imágenes móviles y publicaciones programadas antes de empujar campañas." : "Puedes seguir refinando media y contenido, pero no hay bloqueos visibles para producción."}</p>
          </div>
        </div>
        <Link className="button secondary" href="/admin/seo">Revisar SEO</Link>
      </section>

      {alerts > 0 && (
        <section className="admin-alert-board">
          <div>
            <Sparkles />
            <div>
              <span>CHECKLIST INTELIGENTE</span>
              <h2>Qué arreglar ahora.</h2>
              <p>Ordena el trabajo del admin para que la página se vea pro sin revisar módulo por módulo.</p>
            </div>
          </div>
          <div>
            {checklist.filter(([, count]) => Number(count) > 0).map(([label, count, href]) => (
              <Link href={String(href)} key={String(label)}>
                <strong>{String(count)}</strong>
                <span>{String(label)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="admin-media-health">
        <article>
          <HardDrive />
          <span>MEDIA ACTIVA</span>
          <h2>{media.count || 0} archivos</h2>
          <p>{mediaSizeMb} MB aproximados en la biblioteca consultada.</p>
          <Link className="text-link" href="/admin/media">Abrir biblioteca</Link>
        </article>
        <article>
          <Archive />
          <span>LIMPIEZA</span>
          <h2>{unusedMedia} sin uso detectado</h2>
          <p>{archivedMedia.count || 0} archivos archivados. Primero archiva; elimina solo cuando el servidor confirme que no hay referencias.</p>
          <Link className="text-link" href="/admin/media">Limpiar media</Link>
        </article>
      </section>

      <section className="admin-panels">
        <article>
          <span>PRÓXIMO EVENTO</span>
          <h2>{events.data?.[0]?.name || "Sin evento programado"}</h2>
          <p>{events.data?.[0]?.starts_at ? `${formatMxDateTime(events.data[0].starts_at)} MX` : "Crea el siguiente evento desde el CMS."}</p>
          <Link className="text-link" href="/admin/eventos">Administrar eventos</Link>
        </article>
        <article>
          <span>PRÓXIMO LANZAMIENTO</span>
          <h2>{releases.data?.[0]?.name || "Sin lanzamiento programado"}</h2>
          <p>{releases.data?.[0]?.releases_at ? `${formatMxDateTime(releases.data[0].releases_at)} MX` : "Programa música desde Lanzamientos."}</p>
          <Link className="text-link" href="/admin/lanzamientos">Administrar lanzamientos</Link>
        </article>
        <article>
          <span>BOOKING</span>
          <h2>{totalBooking.count || 0} solicitudes</h2>
          <p>{newBooking.count || 0} requieren revisión inicial.</p>
          <Link className="text-link" href="/admin/booking">Abrir seguimiento</Link>
        </article>
        <article>
          <span>CIUDADES PRINCIPALES</span>
          {cities.length ? cities.map(([city, count]) => <p key={city}>{city} · {count}</p>) : <p>Se mostrarán después del onboarding de los fans.</p>}
        </article>
      </section>
    </>
  );
}
