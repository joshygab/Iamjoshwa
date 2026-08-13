"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Headphones, Mail, MapPin, QrCode, Sparkles, Zap } from "lucide-react";

type Project = "iamjoshwa" | "afterluv";
type Action = (formData: FormData) => Promise<{ ok: boolean } | void>;

type Props = {
  action: Action;
  genres: string[];
  profile: {
    displayName: string;
    alias: string;
    city: string;
    country: string;
    favoriteProject: Project;
    favoriteGenres: string[];
    memberNumber: string;
  };
};

const preferences = [
  ["events", "Próximas fechas", "Shows, nuevas ciudades y anuncios importantes.", true],
  ["sets", "Nuevos sets", "Sesiones, lives y mixes exclusivos.", true],
  ["releases", "Lanzamientos", "Tracks disponibles y estrenos.", true],
  ["presaves", "Pre-saves", "Campañas antes del estreno.", true],
  ["tickets", "Últimos boletos", "Preventas y alerts de sold out.", true],
  ["secret", "Eventos secretos", "Raves, pop-ups y drops limitados.", false],
  ["exclusive", "The Vault", "Contenido desbloqueable y recompensas.", false],
  ["cityBased", "Según mi ciudad", "Avisos cercanos a tu ubicación.", true],
] as const;

const universeCopy = {
  iamjoshwa: {
    label: "IAMJOSHWA",
    subtitle: "House / Latin / Club / Disco",
    color: "violet",
    description: "El universo brillante, elegante y club-forward.",
  },
  afterluv: {
    label: "AFTERLUV",
    subtitle: "Hard / Rave / Trance / Dark",
    color: "red",
    description: "El lado oscuro, rápido y emocional.",
  },
} satisfies Record<Project, { label: string; subtitle: string; color: string; description: string }>;

export function OnboardingWizard({ action, genres, profile }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activated, setActivated] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [alias, setAlias] = useState(profile.alias);
  const [city, setCity] = useState(profile.city);
  const [country, setCountry] = useState(profile.country || "México");
  const [project, setProject] = useState<Project>(profile.favoriteProject);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(profile.favoriteGenres);

  const visibleName = useMemo(() => (alias || name || "JOSHY").trim().toUpperCase(), [alias, name]);
  const visibleCity = useMemo(() => (city || "CDMX").trim().toUpperCase(), [city]);
  const visibleCountry = useMemo(() => countryBadge(country), [country]);
  const progress = step === 0 ? 6 : Math.round((step / 5) * 100);

  function validateCurrentStep() {
    const form = formRef.current;
    if (!form) return false;
    const data = new FormData(form);

    if (step === 1) {
      const required = ["name", "city", "country"].some((key) => String(data.get(key) || "").trim().length < 2);
      if (required) return setValidation("Completa nombre, ciudad y país para continuar.");
    }

    if (step === 3 && data.getAll("genres").length === 0) {
      return setValidation("Elige al menos un género para personalizar tu Pass.");
    }

    setError("");
    return true;
  }

  function setValidation(message: string) {
    setError(message);
    return false;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((value) => Math.min(value + 1, 5));
  }

  async function submit(formData: FormData) {
    if (!validateCurrentStep()) return;
    setIsSaving(true);
    setError("");

    try {
      await action(formData);
      setActivated(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo activar tu Pass. Intenta otra vez.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((current) => (current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]));
  }

  if (activated) {
    return (
      <section className="onboarding-page premium-onboarding-page pass-activation-screen">
        <div className="activation-card-shell" data-project={project}>
          <div className="activation-burst" aria-hidden="true" />
          <PassPreview name={visibleName} city={visibleCity} country={visibleCountry} project={project} memberNumber={profile.memberNumber} active />
          <div className="activation-copy">
            <span className="section-kicker">PASS ACTIVATED</span>
            <h1>Bienvenido al Inner Circle.</h1>
            <p>Tu credencial ya está activa. Empiezas en nivel Listener y tus puntos se moverán únicamente desde acciones verificadas por servidor.</p>
            <div className="activation-stats">
              <span>LEVEL 01 — LISTENER</span>
              <strong>+ puntos iniciales</strong>
              <small>Perfil completado</small>
            </div>
            <Link className="button primary" href="/perfil?activated=pass">
              Ver mi Pass <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-page premium-onboarding-page">
      <form ref={formRef} action={submit} className="onboarding-form onboarding-club-shell" data-project={project}>
        <input type="hidden" name="channel" value="email" />
        <input type="hidden" name="iamjoshwa" value={project === "iamjoshwa" ? "on" : ""} disabled={project !== "iamjoshwa"} />
        <input type="hidden" name="afterluv" value={project === "afterluv" ? "on" : ""} disabled={project !== "afterluv"} />

        <div className="onboarding-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <aside className="onboarding-pass-stage">
          <PassPreview name={visibleName} city={visibleCity} country={visibleCountry} project={project} memberNumber={profile.memberNumber} />
          <div className="pass-live-hints">
            <span>LIVE PREVIEW</span>
            <p>Tu tarjeta cambia mientras completas el onboarding.</p>
          </div>
        </aside>

        <main className="onboarding-flow-panel">
          <div className="onboarding-progress-head">
            <div>
              <span className="section-kicker">{step === 0 ? "INNER CIRCLE" : `PASO ${step}/5`}</span>
              <h1>{step === 0 ? "WELCOME TO THE INNER CIRCLE" : stepTitles[step].title}</h1>
              <p>{step === 0 ? "Tu IAMJOSHWA Pass está por activarse. Configúralo como una credencial de club, no como un formulario." : stepTitles[step].copy}</p>
            </div>
            <div className="step-pill">{progress}%</div>
          </div>

          <div className="wizard-progress" aria-label={`Progreso ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          {error ? <p className="error-alert" role="alert">{error}</p> : null}

          <section className="onboarding-step premium-step" hidden={step !== 0}>
            <div className="welcome-panel">
              <Sparkles />
              <h2>Esto desbloquea tu cuenta de fan.</h2>
              <p>Después podrás ver recompensas, QR personal, progreso de nivel, preferencias y accesos a The Vault.</p>
              <button className="button primary" type="button" onClick={() => setStep(1)}>
                Crear mi Pass <ArrowRight />
              </button>
            </div>
          </section>

          <section className="onboarding-step premium-step" hidden={step !== 1}>
            <div className="identity-fields">
              <label>
                Nombre *
                <input name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" autoComplete="name" />
              </label>
              <label>
                Alias público
                <input name="alias" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Ej. Joshy" autoComplete="nickname" />
              </label>
              <label>
                Ciudad *
                <input name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ciudad de México" autoComplete="address-level2" />
              </label>
              <label>
                País *
                <input name="country" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="México" autoComplete="country-name" />
              </label>
            </div>
          </section>

          <section className="onboarding-step premium-step" hidden={step !== 2}>
            <div className="universe-choice-grid premium-universe-grid">
              {(["iamjoshwa", "afterluv"] as const).map((item) => (
                <label key={item}>
                  <input type="radio" name="project" value={item} checked={project === item} onChange={() => setProject(item)} />
                  <span>
                    {item === "iamjoshwa" ? <Headphones /> : <Zap />}
                    <strong>{universeCopy[item].label}</strong>
                    <small>{universeCopy[item].subtitle}</small>
                    <em>{universeCopy[item].description}</em>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="onboarding-step premium-step" hidden={step !== 3}>
            <fieldset className="chip-fieldset borderless-fieldset">
              <legend>Géneros favoritos</legend>
              <div className="genre-chip-grid">
                {genres.map((genre) => (
                  <label key={genre}>
                    <input type="checkbox" name="genres" value={genre} checked={selectedGenres.includes(genre)} onChange={() => toggleGenre(genre)} />
                    <span>{genre}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="onboarding-step premium-step" hidden={step !== 4}>
            <fieldset className="chip-fieldset borderless-fieldset">
              <legend>Qué quieres recibir</legend>
              <div className="preference-card-grid">
                {preferences.map(([nameValue, label, copy, checked]) => (
                  <label key={nameValue}>
                    <input type="checkbox" name={nameValue} defaultChecked={checked} />
                    <span>
                      <strong>{label}</strong>
                      <small>{copy}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="onboarding-step premium-step" hidden={step !== 5}>
            <div className="channel-grid">
              <label className="channel-card active">
                <input type="radio" name="preferred_channel_visual" defaultChecked />
                <span>
                  <Mail />
                  <strong>Email</strong>
                  <small>Activo ahora</small>
                </span>
              </label>
              <div className="channel-card disabled" aria-disabled="true">
                <span>
                  <QrCode />
                  <strong>WhatsApp</strong>
                  <small>Coming soon</small>
                </span>
              </div>
              <div className="channel-card disabled" aria-disabled="true">
                <span>
                  <Zap />
                  <strong>Push</strong>
                  <small>Coming soon</small>
                </span>
              </div>
            </div>
            <label className="checkbox consent premium-consent">
              <input type="checkbox" name="communications" />
              <span>Acepto recibir comunicaciones según mis preferencias. Puedo retirarlo cuando quiera.</span>
            </label>
          </section>

          {step > 0 ? (
            <div className="wizard-actions">
              <button className="button secondary" type="button" onClick={() => { setError(""); setStep((value) => Math.max(value - 1, 0)); }} disabled={isSaving}>
                <ArrowLeft /> Atrás
              </button>
              {step < 5 ? (
                <button className="button primary" type="button" onClick={next}>
                  Continuar <ArrowRight />
                </button>
              ) : (
                <button className="button primary" disabled={isSaving}>
                  {isSaving ? "Activando..." : "Activar Pass"} <Check />
                </button>
              )}
            </div>
          ) : null}

          <div className="onboarding-map-note">
            <MapPin />
            <span>La ciudad ayuda a priorizar avisos de shows cercanos. WhatsApp queda preparado, pero desactivado hasta conectar un proveedor real.</span>
          </div>
        </main>
      </form>
    </section>
  );
}

const stepTitles: Record<number, { title: string; copy: string }> = {
  1: { title: "¿Cómo quieres aparecer en tu Pass?", copy: "Nombre, alias y ciudad se reflejan en vivo en tu credencial." },
  2: { title: "Elige tu universo favorito.", copy: "IAMJOSHWA y AFTERLUV viven en la misma cuenta. Tu selección personaliza colores, avisos y recomendaciones." },
  3: { title: "Marca tus géneros favoritos.", copy: "Sin checkboxes aburridos: elige la energía que quieres recibir primero." },
  4: { title: "Controla tu señal.", copy: "Tú decides qué novedades, preventas y drops quieres recibir." },
  5: { title: "Canal preferido.", copy: "Email está activo. WhatsApp y Push quedan visibles como próximos canales, sin simular mensajes reales." },
};

function PassPreview({ name, city, country, project, memberNumber, active = false }: { name: string; city: string; country: string; project: Project; memberNumber: string; active?: boolean }) {
  return (
    <div className="live-pass-card" data-project={project} data-active={active}>
      <div className="live-pass-glow" aria-hidden="true" />
      <div className="live-pass-top">
        <span>IAMJOSHWA PASS</span>
        <small>INNER CIRCLE ACCESS</small>
      </div>
      <div className="live-pass-identity">
        <strong>{name}</strong>
        <span>{city} · {country}</span>
      </div>
      <div className="live-pass-bottom">
        <div>
          <small>LEVEL 01</small>
          <strong>LISTENER</strong>
        </div>
        <div className="live-pass-number">#{memberNumber}</div>
      </div>
      <div className="live-pass-qr" aria-label="QR visual del Pass">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function countryBadge(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "MX";
  if (["méxico", "mexico", "mx"].includes(normalized)) return "MX";
  return normalized.slice(0, 2).toUpperCase();
}
