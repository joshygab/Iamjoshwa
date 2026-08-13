"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, CalendarDays, Check, Copy, Download, Headphones, Mail, Sparkles, Users, Zap } from "lucide-react";

const eventTypes = ["Club", "Festival", "Rave", "Evento privado", "Evento corporativo", "Evento universitario", "Showcase", "Opening", "Closing"] as const;
const genreOptions = ["House", "Tech House", "Afro House", "Latin House", "Disco", "Nu Disco", "Reguetón", "EDM", "Hard Techno", "Hard Trance", "Hard Bounce", "Euro Dance"];

export function BookingForm({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; folio?: string }>({ loading: false });
  const [eventType, setEventType] = useState<(typeof eventTypes)[number] | "">("");
  const [project, setProject] = useState<"iamjoshwa" | "afterluv">("iamjoshwa");

  const guidance = useMemo(() => {
    if (["Festival", "Rave", "Showcase"].includes(eventType)) return "Incluye lineup, horario tentativo, capacidad, escenario y responsable de producción.";
    if (["Evento privado", "Evento corporativo", "Evento universitario"].includes(eventType)) return "Incluye objetivo del evento, perfil del público y si habrá protocolo, marca o universidad involucrada.";
    if (["Opening", "Closing"].includes(eventType)) return "Indica el artista principal, horario exacto y energía deseada para el set.";
    return "Incluye ciudad, venue, horario ideal, capacidad y contexto musical de la noche.";
  }, [eventType]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    if (!enabled) {
      setState({ loading: false, error: "El envío todavía no está conectado. La información permanece en este formulario y no se ha guardado ni enviado." });
      return;
    }
    setState({ loading: true });
    const element = event.currentTarget;
    const form = new FormData(element);
    const typedGenres = String(form.get("genresText") || "").split(",").map((value) => value.trim()).filter(Boolean);
    const selectedGenres = form.getAll("genres").map(String);
    const body = {
      name: form.get("name"),
      company: form.get("company"),
      email: form.get("email"),
      whatsapp: form.get("whatsapp") || undefined,
      eventType: form.get("eventType"),
      eventDate: form.get("eventDate"),
      eventTime: form.get("eventTime") || undefined,
      city: form.get("city"),
      venue: form.get("venue") || undefined,
      attendance: form.get("attendance") || undefined,
      setDuration: form.get("setDuration") || undefined,
      project: form.get("project"),
      genres: Array.from(new Set([...selectedGenres, ...typedGenres])),
      budget: form.get("budget") || undefined,
      equipment: form.get("equipment") || undefined,
      production: form.get("production") || undefined,
      message: form.get("message"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
    };
    try {
      const response = await fetch("/api/booking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setState({ loading: false, folio: data.folio });
      element.reset();
      setEventType("");
      setProject("iamjoshwa");
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : "No fue posible enviar." });
    }
  }

  if (state.folio) return <BookingSuccess folio={state.folio} onReset={() => setState({ loading: false })} />;

  return (
    <form className="booking-form pro-booking-form" onSubmit={submit}>
      <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <section className="booking-form-card">
        <div className="booking-form-head">
          <span>01</span>
          <div>
            <h2>Promotor / contacto</h2>
            <p>Datos básicos para responder y dar seguimiento con folio.</p>
          </div>
        </div>
        <div className="field-grid">
          <label>Nombre *<input name="name" minLength={2} maxLength={100} required autoComplete="name" /></label>
          <label>Empresa / promotor *<input name="company" minLength={2} maxLength={120} required autoComplete="organization" /></label>
          <label>Correo *<input name="email" type="email" required autoComplete="email" /></label>
          <label>WhatsApp<input name="whatsapp" type="tel" autoComplete="tel" placeholder="+52..." /></label>
        </div>
      </section>

      <section className="booking-form-card">
        <div className="booking-form-head">
          <span>02</span>
          <div>
            <h2>Formato del show</h2>
            <p>Selecciona el tipo de evento y el universo artístico ideal.</p>
          </div>
        </div>
        <div className="booking-type-grid">
          {eventTypes.map((type) => (
            <label key={type}>
              <input type="radio" name="eventType" value={type} required checked={eventType === type} onChange={() => setEventType(type)} />
              <span>{type}</span>
            </label>
          ))}
        </div>
        <div className="booking-project-grid">
          <label>
            <input type="radio" name="project" value="iamjoshwa" checked={project === "iamjoshwa"} onChange={() => setProject("iamjoshwa")} />
            <span><Headphones /><strong>IAMJOSHWA</strong><small>House, Latin House, Tech House, Disco, club energy.</small></span>
          </label>
          <label>
            <input type="radio" name="project" value="afterluv" checked={project === "afterluv"} onChange={() => setProject("afterluv")} />
            <span><Zap /><strong>AFTERLUV</strong><small>Hard Bounce, Hard Trance, Hard Techno, rave emotional.</small></span>
          </label>
        </div>
      </section>

      <section className="booking-form-card">
        <div className="booking-form-head">
          <span>03</span>
          <div>
            <h2>Fecha y producción</h2>
            <p>{guidance}</p>
          </div>
        </div>
        <div className="field-grid">
          <label>Fecha *<input name="eventDate" type="date" required /></label>
          <label>Horario<input name="eventTime" type="time" /></label>
          <label>Ciudad *<input name="city" minLength={2} required autoComplete="address-level2" /></label>
          <label>Venue<input name="venue" placeholder="Nombre del lugar o por confirmar" /></label>
          <label>Asistentes aproximados<input name="attendance" type="number" min="1" max="1000000" /></label>
          <label>Duración<select name="setDuration" defaultValue="90"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option><option value="180">180 min</option></select></label>
        </div>
        {["Festival", "Rave", "Showcase"].includes(eventType) ? (
          <div className="booking-conditional-note">
            <Sparkles />
            <span>Para este formato conviene agregar lineup, escenario, horarios de soundcheck y contacto técnico.</span>
          </div>
        ) : null}
        {["Evento corporativo", "Evento universitario"].includes(eventType) ? (
          <div className="booking-conditional-note">
            <Briefcase />
            <span>Si hay marca, universidad o protocolo, descríbelo para preparar una propuesta alineada.</span>
          </div>
        ) : null}
      </section>

      <section className="booking-form-card">
        <div className="booking-form-head">
          <span>04</span>
          <div>
            <h2>Dirección musical</h2>
            <p>Esto no fija precio; solo ayuda a entender la energía del evento.</p>
          </div>
        </div>
        <div className="booking-genre-grid">
          {genreOptions.map((genre) => (
            <label key={genre}>
              <input type="checkbox" name="genres" value={genre} defaultChecked={project === "afterluv" ? genre.startsWith("Hard") : ["House", "Tech House", "Latin House"].includes(genre)} />
              <span>{genre}</span>
            </label>
          ))}
        </div>
        <label>Otros géneros o referencias<input name="genresText" placeholder="Ej. Afro, edits latinos, peak time..." /></label>
        <label>Presupuesto aproximado<input name="budget" placeholder="Rango y moneda. No es cotización definitiva." /></label>
      </section>

      <section className="booking-form-card">
        <div className="booking-form-head">
          <span>05</span>
          <div>
            <h2>Detalles finales</h2>
            <p>Mientras más claro el contexto, más rápido se puede responder.</p>
          </div>
        </div>
        <label>Equipo disponible<textarea name="equipment" rows={2} placeholder="CDJs, mixer, monitores, cabina, backline..." /></label>
        <label>Audio e iluminación<textarea name="production" rows={3} placeholder="PA, iluminación, pantallas, operador, restricciones..." /></label>
        <label>Mensaje *<textarea name="message" rows={5} minLength={20} maxLength={5000} required aria-describedby="message-help" placeholder="Cuéntanos el concepto del evento, horario ideal, lineup, producción y cualquier requerimiento importante." /><small id="message-help">Responderemos con seguimiento humano. No calculamos precio automático.</small></label>
        <label className="checkbox premium-booking-consent"><input name="consent" type="checkbox" required />Acepto ser contactado sobre esta solicitud. *</label>
        {state.error ? <div className="error-alert" role="alert">{state.error}</div> : null}
        <button className="button primary booking-submit" disabled={state.loading}>
          {state.loading ? "Enviando solicitud..." : enabled ? "Enviar solicitud de booking" : "Validar solicitud"} <ArrowRight />
        </button>
        {!enabled ? <p className="form-note">Modo demostración: el formulario valida los datos, pero no los envía.</p> : null}
      </section>
    </form>
  );
}

function BookingSuccess({ folio, onReset }: { folio: string; onReset: () => void }) {
  async function copyFolio() {
    await navigator.clipboard.writeText(folio);
  }

  return (
    <div className="booking-success">
      <div className="booking-success-mark"><Check /></div>
      <span className="section-kicker">SOLICITUD RECIBIDA</span>
      <h2>Tu fecha ya está en revisión.</h2>
      <p>Folio de seguimiento:</p>
      <code>{folio}</code>
      <div className="booking-success-grid">
        <article><Mail /><strong>Respuesta estimada</strong><span>Normalmente dentro de 24–48 horas hábiles.</span></article>
        <article><Users /><strong>Revisión humana</strong><span>No hay cotización automática. Se evalúa contexto y producción.</span></article>
        <article><CalendarDays /><strong>Siguiente paso</strong><span>Guarda el folio y revisa tu correo.</span></article>
      </div>
      <div className="inline-actions">
        <button className="button secondary" onClick={() => void copyFolio()}><Copy /> Copiar folio</button>
        <Link className="button secondary" href="/epk"><Download /> Descargar / ver EPK</Link>
        <button className="button primary" onClick={onReset}>Nueva solicitud</button>
      </div>
    </div>
  );
}
