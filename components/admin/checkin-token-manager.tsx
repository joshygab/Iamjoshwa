"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  createCheckinToken,
  disableCheckinToken,
  disableManualCheckinCode,
  setManualCheckinCode,
  type CheckinTokenState,
  type ManualCheckinCodeState,
} from "@/app/admin/module-actions";
import { formatMxDateTime } from "@/lib/dates";

type EventOption = {
  id: string;
  name: string;
};

type TokenRow = {
  id: string;
  event_id: string;
  active: boolean;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
  events?: { name: string } | null;
};

type CodeRow = {
  id: string;
  event_id: string;
  active: boolean;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
  events?: { name: string } | null;
};

const initialQrState: CheckinTokenState = {};
const initialCodeState: ManualCheckinCodeState = {};

export function CheckinTokenManager({
  events,
  tokens,
  codes,
}: {
  events: EventOption[];
  tokens: TokenRow[];
  codes: CodeRow[];
}) {
  const [qrState, qrAction, qrPending] = useActionState(createCheckinToken, initialQrState);
  const [codeState, codeAction, codePending] = useActionState(setManualCheckinCode, initialCodeState);
  const activeCodes = codes.filter((code) => code.active && !code.revoked_at);

  return (
    <section className="checkin-manager">
      <div className="checkin-code-studio">
        <article className="checkin-code-hero">
          <span className="section-kicker">CHECK-IN CODE</span>
          <h2>Código manual por evento.</h2>
          <p>
            Crea un código corto para la noche. El fan lo escribe en la app y el servidor valida
            asistencia, puntos e insignias una sola vez.
          </p>
          <div className="checkin-code-preview" aria-hidden="true">
            {codeState.normalizedCode || "JOSHWA21"}
          </div>
        </article>

        <form action={codeAction} className="settings-card checkin-code-form">
          <span>Activar código</span>
          <label>
            Evento
            <select name="eventId" required>
              <option value="">Selecciona un evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Código
            <input
              name="code"
              inputMode="text"
              minLength={4}
              maxLength={32}
              placeholder="JOSHWA21"
              required
            />
          </label>
          <label>
            Expira
            <input name="expiresAt" type="datetime-local" required />
          </label>
          <p className="form-note">
            Puedes escribirlo con espacios o guiones. La app lo normaliza; por ejemplo “JOSHWA-21”
            funciona igual que “JOSHWA21”.
          </p>
          <button className="button primary" disabled={codePending}>
            {codePending ? "Activando..." : "Activar código"}
          </button>
          {codeState.message ? (
            <div className={codeState.ok ? "success-alert" : "error-alert"} role="status">
              {codeState.message}
            </div>
          ) : null}
        </form>
      </div>

      <div className="manual-code-list">
        <div className="admin-table-head">
          <span>Códigos activos</span>
          <span>{activeCodes.length} activos</span>
        </div>
        {activeCodes.length ? (
          activeCodes.map((code) => (
            <article key={code.id}>
              <div>
                <strong>{code.events?.name || "Evento"}</strong>
                <small>Activo · expira {formatMxDateTime(code.expires_at)} MX</small>
              </div>
              <form action={disableManualCheckinCode}>
                <input type="hidden" name="codeId" value={code.id} />
                <button className="button danger-button">Desactivar</button>
              </form>
            </article>
          ))
        ) : (
          <div className="admin-empty">
            <h2>Sin códigos activos.</h2>
            <p>Activa un código cuando estés listo para abrir check-in en un evento.</p>
          </div>
        )}
      </div>

      <details className="settings-card checkin-qr-details">
        <summary>QR opcional / acceso por link</summary>
        <form action={qrAction} className="inline-admin-form">
          <label>
            Evento
            <select name="eventId" required>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expira
            <input name="expiresAt" type="datetime-local" required />
          </label>
          <button className="button secondary" disabled={qrPending}>
            {qrPending ? "Generando..." : "Generar QR"}
          </button>
        </form>
        {qrState.message ? (
          <div className={qrState.ok ? "success-alert" : "error-alert"} role="status">
            {qrState.message}
          </div>
        ) : null}
        {qrState.qr && qrState.url ? (
          <div className="checkin-qr-panel">
            <Image src={qrState.qr} alt="QR de check-in generado" width={260} height={260} unoptimized />
            <div>
              <span className="section-kicker">ACCESO ACTIVO</span>
              <p>
                <strong>URL:</strong>{" "}
                <a href={qrState.url} target="_blank" rel="noreferrer">
                  {qrState.url}
                </a>
              </p>
              <p>
                <strong>Token:</strong> <code>{qrState.token}</code>
              </p>
              <p>Expira: {qrState.expiresAt ? `${formatMxDateTime(qrState.expiresAt)} MX` : "sin fecha"}</p>
            </div>
          </div>
        ) : null}
      </details>

      <div className="admin-table compact-table">
        <div className="admin-table-head">
          <span>QR recientes</span>
          <span>{tokens.length} registros</span>
        </div>
        {tokens.map((token) => (
          <article key={token.id}>
            <div>
              <strong>{token.events?.name || "Evento"}</strong>
              <small>
                {token.active ? "Activo" : "Inactivo"} · expira {formatMxDateTime(token.expires_at)} MX
              </small>
            </div>
            {token.active ? (
              <form action={disableCheckinToken}>
                <input type="hidden" name="tokenId" value={token.id} />
                <button className="button danger-button">Desactivar</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
