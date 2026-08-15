"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarPlus, Clock, Filter, Map, MapPin, Radio, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useUniverse } from "./universe-provider";
import type { EventItem } from "@/types/content";

type Period = "upcoming" | "history";

export function EventList({ items, now }: { items: EventItem[]; now: number }) {
  const { universe } = useUniverse();
  const [period, setPeriod] = useState<Period>("upcoming");
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");

  const scoped = useMemo(() => items.filter((item) => item.universe === universe), [items, universe]);
  const cities = useMemo(() => Array.from(new Set(scoped.map((item) => item.city).filter(Boolean))).sort(), [scoped]);
  const statuses = useMemo(() => Array.from(new Set(scoped.map((item) => item.status))).sort(), [scoped]);
  const upcomingCount = scoped.filter((item) => isUpcoming(item, now)).length;
  const historyCount = scoped.length - upcomingCount;

  const visible = scoped
    .filter((item) => (period === "history" ? !isUpcoming(item, now) : isUpcoming(item, now)))
    .filter((item) => city === "all" || item.city === city)
    .filter((item) => status === "all" || item.status === status)
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return period === "history" ? -diff : diff;
    });

  const timeline = visible.slice(0, 6);

  return (
    <div className="shows-experience">
      <section className="shows-command">
        <div>
          <span className="section-kicker">SHOW CONTROL</span>
          <h2>Encuentra la noche correcta.</h2>
          <p>Filtra por ciudad, estado y periodo. Los eventos finalizados permanecen como archivo oficial.</p>
        </div>
        <div className="shows-stats">
          <article>
            <span>Próximos</span>
            <strong>{upcomingCount}</strong>
          </article>
          <article>
            <span>Historial</span>
            <strong>{historyCount}</strong>
          </article>
          <article>
            <span>Ciudades</span>
            <strong>{cities.length}</strong>
          </article>
        </div>
      </section>

      <div className="shows-filter-bar" aria-label="Filtros de eventos">
        <div role="group" aria-label="Periodo">
          <button className={period === "upcoming" ? "active" : ""} onClick={() => setPeriod("upcoming")} type="button">
            <Radio /> Próximos
          </button>
          <button className={period === "history" ? "active" : ""} onClick={() => setPeriod("history")} type="button">
            <Clock /> Historial
          </button>
        </div>
        <label>
          <Filter /> Ciudad
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="all">Todas</option>
            {cities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Estado
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Todos</option>
            {statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <section className="shows-layout">
        <aside className="shows-timeline-card">
          <span className="section-kicker">LIVE TIMELINE</span>
          <h2>{period === "history" ? "Archivo" : "Próxima ruta"}</h2>
          {timeline.length ? (
            <ol>
              {timeline.map((item) => (
                <li key={item.id}>
                  <time>{formatShortDate(item.date)}</time>
                  <div>
                    <strong>{item.city}</strong>
                    <span>{item.venue}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">NO ACTIVE SIGNAL con estos filtros.</p>
          )}
        </aside>

        <div className="event-grid pro-event-grid mobile-show-mosaic">
          {visible.length ? visible.map((item, index) => {
            const past = !isUpcoming(item, now);
            return <EventCard key={item.id} item={item} past={past} priority={period === "upcoming" && index === 0 && !past} />;
          }) : <EmptyShows />}
        </div>
      </section>

      <section className="shows-map-signal">
        <div>
          <span className="section-kicker">CITY SIGNAL</span>
          <h2>Mapa de ciudades</h2>
          <p>Cuando un evento tenga ubicación oficial, el botón “Mapa” abrirá la ruta real. Aquí se agrupan las ciudades publicadas del universo activo.</p>
        </div>
        <div className="city-signal-grid">
          {cities.length ? cities.map((value, index) => (
            <button key={value} type="button" className={city === value ? "active" : ""} onClick={() => setCity(value)} style={{ "--delay": `${index * 60}ms` } as CSSProperties}>
              <MapPin />
              {value}
            </button>
          )) : <span className="muted">CITY SIGNAL en espera.</span>}
        </div>
      </section>
    </div>
  );
}

function EventCard({ item, past, priority }: { item: EventItem; past: boolean; priority: boolean }) {
  const google = googleCalendarUrl(item);
  const access = eventAccess(item);

  return (
    <article className={`event-card show-card ${past ? "past-show" : ""} ${priority ? "next-show" : ""}`}>
      <Link className="event-card-art show-card-art" href={`/fechas/${item.slug}`}>
        {item.flyerUrl ? <Image src={item.flyerUrl} alt={`Arte de ${item.name}`} fill sizes="(max-width: 760px) 100vw, 33vw" /> : <span>{item.universe}</span>}
        <span className="demo-badge">{priority ? "PRÓXIMA FECHA" : item.demo ? "EVENTO DEMO" : item.status}</span>
        <time>{formatDay(item.date)}<small>{formatMonth(item.date)}</small></time>
      </Link>
      <div>
        <span className="show-status">{past ? "ARCHIVO" : item.status}</span>
        <h2>{item.name}</h2>
        <p>
          <MapPin />
          {item.venue} · {item.city}
        </p>
        <div className="show-meta-row">
          <span>{formatLongDate(item.date)}</span>
          <span>Set {item.setTime}</span>
          <span>{item.priceLabel}</span>
        </div>
        <div className="tag-row">{item.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
        {past && item.afterContent ? (
          <div className="after-show-note">
            <strong>{item.afterContent.title}</strong>
            <span>{item.afterContent.body}</span>
          </div>
        ) : null}
        <div className="show-actions">
          {access.href && !past ? (
            <a className="button primary" href={access.href} target="_blank" rel="noreferrer">
              <Ticket /> {access.label}
            </a>
          ) : (
            <button className="button primary" disabled>
              <Ticket /> {past ? "Finalizado" : access.label}
            </button>
          )}
          {!past ? (
            <a className="button secondary" href={google} target="_blank" rel="noreferrer">
              <CalendarPlus /> Calendario
            </a>
          ) : null}
          {item.mapUrl ? (
            <a className="button secondary" href={item.mapUrl} target="_blank" rel="noreferrer">
              <Map /> Mapa
            </a>
          ) : null}
          <Link className="text-link" href={`/fechas/${item.slug}`}>
            Detalles <ArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}

function eventAccess(item: EventItem) {
  if (item.ticketMode === "registration") return item.registrationUrl ? { label: "Registro", href: item.registrationUrl } : { label: "Registro pronto" };
  if (item.ticketMode === "free") return { label: "Gratis" };
  if (item.ticketMode === "none") return { label: "Detalles" };
  return item.ticketUrl ? { label: "Boletos", href: item.ticketUrl } : { label: "Boletos pronto" };
}

function EmptyShows() {
  return (
    <div className="admin-empty public-empty branded-empty shows-empty">
      <span>NEXT SIGNAL</span>
      <h2>NO ACTIVE SIGNAL.</h2>
      <p>Cambia ciudad, estado o periodo para encontrar la próxima transmisión oficial.</p>
    </div>
  );
}

function isUpcoming(item: EventItem, now: number) {
  return new Date(item.date).getTime() >= now && item.status !== "Finalizado" && item.status !== "Cancelado";
}

function googleCalendarUrl(item: EventItem) {
  const start = calendarDate(item.date);
  const end = calendarDate(new Date(new Date(item.date).getTime() + 2 * 60 * 60 * 1000).toISOString());
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.name)}&dates=${start}/${end}&location=${encodeURIComponent(`${item.venue}, ${item.city}`)}&details=${encodeURIComponent(item.description)}`;
}

function calendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" }).toUpperCase();
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", timeZone: "America/Mexico_City" });
}

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString("es-MX", { month: "short", timeZone: "America/Mexico_City" }).toUpperCase();
}
