"use client";

import { CalendarPlus, Copy, MapPin, MessageCircle, Ticket, UserCheck } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { TrackedLink } from "./tracked-link";
import { EventShareStudio } from "./event-share-studio";
import type { EventTicketMode } from "@/types/content";

type Data = {
  id: string;
  slug: string;
  name: string;
  date: string;
  endDate?: string;
  venue: string;
  city: string;
  ticketMode?: EventTicketMode;
  ticketUrl?: string;
  registrationUrl?: string;
  mapUrl?: string;
  status: string;
  demo?: boolean;
  flyerUrl?: string;
  universe?: "iamjoshwa" | "afterluv";
};

export function EventActions({ event }: { event: Data }) {
  const [state, setState] = useState("");
  const end = event.endDate || new Date(new Date(event.date).getTime() + 6 * 60 * 60 * 1000).toISOString();
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${calendarDate(event.date)}/${calendarDate(end)}&location=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
  const shareUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/fechas/${event.slug}`;

  async function record(action: "confirm_attendance" | "share") {
    if (!isSupabaseConfigured || event.demo) return null;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;
    const { data } = await db.rpc("record_fan_action", { p_action: action, p_source_id: event.id });
    return data as { awarded?: boolean; points?: number } | null;
  }

  async function going() {
    if (!isSupabaseConfigured) return;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      window.location.href = "/acceso";
      return;
    }

    const { error } = await db.from("event_attendees").upsert({ event_id: event.id, user_id: user.id, status: "going" });
    if (error) {
      setState("SIGNAL INTERRUPTED. Intenta confirmar otra vez.");
      return;
    }

    const points = await record("confirm_attendance");
    setState(points?.awarded ? `SIGNAL RECEIVED. +${points.points} puntos.` : "SIGNAL RECEIVED. Asistencia confirmada.");
  }

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    const points = await record("share");
    setState(points?.awarded ? `SAVED TO PASS. +${points.points} puntos.` : "SAVED TO PASS. Enlace copiado.");
  }

  async function share() {
    void record("share");
  }

  const waitlist = event.status === "Lista de espera" || event.status === "Sold out";
  const access = eventAccess(event);

  return (
    <>
      <div className="event-actions">
        {access.href ? (
          <TrackedLink className="button primary sticky-ticket" href={access.href} target="_blank" rel="noreferrer" action={access.action} entityType="events" entityId={event.id} label={event.name}>
            <Ticket /> {access.label}
          </TrackedLink>
        ) : (
          <button className="button primary" disabled>
            <Ticket /> {access.label || (waitlist ? "Waitlist queued" : "Tickets incoming")}
          </button>
        )}
        <button className="button secondary" onClick={going} disabled={!isSupabaseConfigured || event.demo}>
          <UserCheck /> {isSupabaseConfigured && !event.demo ? "Voy a asistir" : "Attendance queued"}
        </button>
        <TrackedLink className="button secondary" href={google} target="_blank" rel="noreferrer" action="calendar_click" entityType="events" entityId={event.id} label={event.name}>
          <CalendarPlus /> Google Calendar
        </TrackedLink>
        <a className="icon-button" aria-label="Descargar archivo de calendario" href={`/api/events/${event.id}/ics`}>
          <CalendarPlus />
        </a>
        {event.mapUrl ? (
          <TrackedLink className="icon-button" aria-label="Abrir mapa" href={event.mapUrl} target="_blank" rel="noreferrer" action="map_click" entityType="events" entityId={event.id} label={event.name}>
            <MapPin />
          </TrackedLink>
        ) : null}
        <a className="icon-button" aria-label="Compartir por WhatsApp" onClick={share} href={`https://wa.me/?text=${encodeURIComponent(`${event.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer">
          <MessageCircle />
        </a>
        <button className="icon-button" aria-label="Copiar enlace" onClick={copy}>
          <Copy />
        </button>
      </div>
      <EventShareStudio event={event} />
      {state ? <p className="success-alert" role="status">{state}</p> : null}
    </>
  );
}

function eventAccess(event: Data): { label: string; href?: string; action: "ticket_click" | "registration_click" } {
  const mode = event.ticketMode || (event.registrationUrl ? "registration" : event.ticketUrl ? "tickets" : "tickets");
  if (mode === "registration") {
    return event.registrationUrl
      ? { label: "Registrarme", href: event.registrationUrl, action: "registration_click" }
      : { label: "Registro pronto", action: "registration_click" };
  }
  if (mode === "free") return { label: "Entrada gratuita", action: "ticket_click" };
  if (mode === "none") return { label: "Detalles del evento", action: "ticket_click" };
  return event.ticketUrl ? { label: "Comprar boletos", href: event.ticketUrl, action: "ticket_click" } : { label: "Tickets incoming", action: "ticket_click" };
}

function calendarDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
