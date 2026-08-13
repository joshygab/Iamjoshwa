"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Headphones, Mail, MapPin, Zap } from "lucide-react";

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  action: Action;
  genres: string[];
  profile: {
    displayName: string;
    alias: string;
  };
};

const steps = [
  { label: "Identidad", title: "Primero, tu nombre dentro del club.", copy: "Esto crea tu IAMJOSHWA Pass y nos ayuda a personalizar tu experiencia." },
  { label: "Universo", title: "Elige la energía que quieres seguir.", copy: "Puedes cambiarlo después. IAMJOSHWA y AFTERLUV viven en la misma cuenta." },
  { label: "Avisos", title: "Controla qué señal recibes.", copy: "Solo enviaremos mensajes con consentimiento y podrás cambiarlo desde tu perfil." },
];

export function OnboardingWizard({ action, genres, profile }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  function next() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    if (step === 0) {
      const required = ["name", "city", "country"].some((key) => String(data.get(key) || "").trim().length < 2);
      if (required) {
        setError("Completa nombre, ciudad y país para continuar.");
        return;
      }
    }
    if (step === 1 && data.getAll("genres").length === 0) {
      setError("Elige al menos un género para personalizar tus avisos.");
      return;
    }
    setError("");
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function submit(formData: FormData) {
    setError("");
    startTransition(() => {
      void action(formData);
    });
  }

  return (
    <section className="onboarding-page premium-onboarding-page">
      <form ref={formRef} action={submit} className="onboarding-form onboarding-wizard">
        <input type="hidden" name="channel" value="email" />
        <div className="onboarding-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="onboarding-progress-head">
          <div>
            <span className="section-kicker">CONFIGURA TU PASS</span>
            <h1>Haz tuya la señal.</h1>
          </div>
          <div className="step-pill">Paso {step + 1}/3</div>
        </div>
        <div className="wizard-progress" aria-label={`Progreso ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        {error ? <p className="error-alert" role="alert">{error}</p> : null}

        <section className="onboarding-step" hidden={step !== 0}>
          <div className="step-copy">
            <span>{steps[0].label}</span>
            <h2>{steps[0].title}</h2>
            <p>{steps[0].copy}</p>
          </div>
          <div className="field-grid onboarding-fields">
            <label>
              Nombre *
              <input name="name" defaultValue={profile.displayName} placeholder="Tu nombre" autoComplete="name" />
            </label>
            <label>
              Alias público
              <input name="alias" defaultValue={profile.alias} placeholder="Ej. Joshwa" autoComplete="nickname" />
            </label>
            <label>
              Ciudad *
              <input name="city" placeholder="Ciudad de México" autoComplete="address-level2" />
            </label>
            <label>
              País *
              <input name="country" placeholder="México" autoComplete="country-name" />
            </label>
          </div>
        </section>

        <section className="onboarding-step" hidden={step !== 1}>
          <div className="step-copy">
            <span>{steps[1].label}</span>
            <h2>{steps[1].title}</h2>
            <p>{steps[1].copy}</p>
          </div>
          <div className="universe-choice-grid">
            <label>
              <input type="radio" name="project" value="iamjoshwa" defaultChecked />
              <span>
                <Headphones />
                <strong>IAMJOSHWA</strong>
                <small>House, club culture, brillo futurista y CDMX.</small>
              </span>
            </label>
            <label>
              <input type="radio" name="project" value="afterluv" />
              <span>
                <Zap />
                <strong>AFTERLUV</strong>
                <small>Más oscuro, rápido, emocional y rave.</small>
              </span>
            </label>
          </div>
          <fieldset className="chip-fieldset">
            <legend>Géneros favoritos</legend>
            <div className="genre-chip-grid">
              {genres.map((genre) => (
                <label key={genre}>
                  <input type="checkbox" name="genres" value={genre} />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="onboarding-step" hidden={step !== 2}>
          <div className="step-copy">
            <span>{steps[2].label}</span>
            <h2>{steps[2].title}</h2>
            <p>{steps[2].copy}</p>
          </div>
          <div className="notification-card">
            <Mail />
            <div>
              <strong>Email activo</strong>
              <p>WhatsApp y Push quedan preparados para futuro, pero no se simulan mensajes sin credenciales reales.</p>
            </div>
          </div>
          <fieldset className="chip-fieldset">
            <legend>Quiero recibir</legend>
            <div className="preference-chip-grid">
              {[
                ["events", "Próximas fechas", true],
                ["releases", "Nuevas canciones", true],
                ["presaves", "Pre-saves", true],
                ["sets", "Sets", true],
                ["tickets", "Preventas y últimos boletos", true],
                ["secret", "Eventos secretos", false],
                ["exclusive", "Contenido exclusivo", false],
                ["iamjoshwa", "IAMJOSHWA", true],
                ["afterluv", "AFTERLUV", true],
                ["cityBased", "Eventos según mi ciudad", true],
              ].map(([name, label, checked]) => (
                <label key={String(name)}>
                  <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />
                  <span>{String(label)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="checkbox consent premium-consent">
            <input type="checkbox" name="communications" />
            <span>Acepto recibir comunicaciones según estas preferencias. Puedo retirarlo cuando quiera.</span>
          </label>
        </section>

        <div className="wizard-actions">
          <button className="button secondary" type="button" onClick={() => { setError(""); setStep((value) => Math.max(value - 1, 0)); }} disabled={step === 0 || isPending}>
            <ArrowLeft /> Atrás
          </button>
          {step < steps.length - 1 ? (
            <button className="button primary" type="button" onClick={next}>
              Continuar <ArrowRight />
            </button>
          ) : (
            <button className="button primary" disabled={isPending}>
              {isPending ? "Creando Pass..." : "Crear mi Pass"} <Check />
            </button>
          )}
        </div>

        <div className="onboarding-map-note">
          <MapPin />
          <span>Tu ciudad se usará para avisos de eventos cercanos cuando actives esa preferencia.</span>
        </div>
      </form>
    </section>
  );
}
