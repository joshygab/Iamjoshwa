"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CheckinPayload = {
  already_checked_in?: boolean;
  points?: number;
  event_name?: string;
};

export function CheckinForm({ initialToken }: { initialToken: string }) {
  const [state, setState] = useState<{ loading?: boolean; message?: string; ok?: boolean }>({});
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
      const eventName = data.event_name ? ` · ${data.event_name}` : "";

      setState({
        ok: true,
        message: data.already_checked_in
          ? `Ya habías registrado tu asistencia${eventName}.`
          : `Check-in completo${eventName}. +${data.points || 100} puntos.`,
      });
    } catch {
      setState({ ok: false, message: "Código inválido, vencido o desactivado." });
    }
  }

  return (
    <form onSubmit={submit} className="auth-form checkin-code-entry">
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
        {state.loading ? "Validando…" : "Confirmar asistencia"}
      </button>
    </form>
  );
}
