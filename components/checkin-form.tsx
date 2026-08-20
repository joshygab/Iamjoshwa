"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, QrCode, Sparkles, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CheckinPayload = {
  already_checked_in?: boolean;
  points?: number;
  event_name?: string;
  badge_awarded?: boolean;
};

type CheckinState = {
  loading?: boolean;
  message?: string;
  ok?: boolean;
  already?: boolean;
  eventName?: string;
  points?: number;
  badgeAwarded?: boolean;
};

export function CheckinForm({ initialToken }: { initialToken: string }) {
  const [state, setState] = useState<CheckinState>({});
  const initialCode = useMemo(() => initialToken.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), [initialToken]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ loading: true });

    const rawCode = String(new FormData(e.currentTarget).get("token") || "").trim();
    const db = createClient();

    try {
      let response = await db.rpc("redeem_event_checkin_code", { p_code: rawCode });

      if (response.error) {
        response = await db.rpc("redeem_checkin", { p_token: rawCode });
      }

      if (response.error) throw response.error;

      const data = response.data as CheckinPayload;
      const eventName = data.event_name || "Evento IAMJOSHWA";
      const points = data.already_checked_in ? 0 : data.points || 100;

      setState({
        ok: true,
        already: Boolean(data.already_checked_in),
        eventName,
        points,
        badgeAwarded: Boolean(data.badge_awarded),
        message: data.already_checked_in
          ? `Ya habías registrado tu asistencia · ${eventName}.`
          : `Pass activado · ${eventName}. +${points} puntos.`,
      });
    } catch {
      setState({ ok: false, message: "Código inválido, vencido o desactivado." });
    }
  }

  if (state.ok) {
    return (
      <section className="pass-activation-shell" aria-live="polite">
        <article className="pass-activation-card">
          <div className="pass-activation-orbit" aria-hidden="true">
            <Sparkles />
          </div>
          <span>IAMJOSHWA PASS</span>
          <h2>{state.already ? "PASS ALREADY ACTIVE" : "PASS ACTIVATED"}</h2>
          <p>{state.already ? "Tu asistencia ya estaba registrada para este evento." : "Tu asistencia quedó registrada y tu señal fue guardada en el Pass."}</p>
          <dl>
            <div>
              <dt>Evento</dt>
              <dd>{state.eventName}</dd>
            </div>
            <div>
              <dt>XP</dt>
              <dd>{state.points || 0}</dd>
            </div>
            <div>
              <dt>Badge</dt>
              <dd>{state.badgeAwarded ? "Unlocked" : state.already ? "Already saved" : "Saved"}</dd>
            </div>
          </dl>
        </article>
        <div className="pass-activation-actions">
          <Link className="button primary" href="/perfil">
            <Sparkles /> Ver mi Pass
          </Link>
          <Link className="button secondary" href="/the-vault">
            <Ticket /> Explorar Vault
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="auth-form checkin-code-entry">
      <div className="checkin-mini-pass" aria-hidden="true">
        <div>
          <span>INNER CIRCLE ACCESS</span>
          <strong>CHECK-IN</strong>
        </div>
        <QrCode />
      </div>
      <label>
        Código del evento
        <input
          name="token"
          defaultValue={initialCode}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          minLength={4}
          maxLength={48}
          placeholder="JOSHWA21"
          required
        />
      </label>
      <p className="form-note">
        Pide el código al staff o al artista dentro del evento. Puedes escribirlo con guiones o espacios.
      </p>
      {state.message ? <div className={state.ok ? "success-alert" : "error-alert"}>{state.message}</div> : null}
      <button className="button primary" disabled={state.loading}>
        {state.loading ? (
          <>
            <span className="button-loader" /> Validando…
          </>
        ) : (
          <>
            <CheckCircle2 /> Activar Pass
          </>
        )}
      </button>
    </form>
  );
}
