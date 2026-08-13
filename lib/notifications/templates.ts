import "server-only";
import { createUnsubscribeToken } from "@/lib/email/unsubscribe";

type TemplateData = {
  title?: string;
  message?: string;
  url?: string;
  cta?: string;
  eyebrow?: string;
};

export function buildCampaignEmail(input: {
  userId: string;
  templateKey?: string | null;
  subject: string;
  data: TemplateData;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const title = input.data.title || input.subject || "Nueva señal IAMJOSHWA";
  const message = input.data.message || defaultMessage(input.templateKey);
  const url = internalUrl(input.data.url, origin);
  const cta = input.data.cta || defaultCta(input.templateKey);
  const unsubscribe = `${origin}/notificaciones/baja?token=${encodeURIComponent(createUnsubscribeToken(input.userId))}`;
  const eyebrow = input.data.eyebrow || eyebrowFor(input.templateKey);
  const text = `${title}\n\n${message}\n\n${cta}: ${url}\n\nCancelar suscripción: ${unsubscribe}`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#050505;color:#ffffff;font-family:Arial,Helvetica,sans-serif">
  <div style="padding:36px 18px;background:radial-gradient(circle at 80% 0,#3a164c,transparent 38%),#050505">
    <div style="max-width:680px;margin:auto;border:1px solid rgba(255,255,255,.14);border-radius:28px;overflow:hidden;background:linear-gradient(145deg,#151018,#070609)">
      <div style="padding:34px">
        <p style="margin:0 0 14px;color:#d88cff;font-size:11px;letter-spacing:.18em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0;font-size:44px;line-height:.92;letter-spacing:-.05em">${escapeHtml(title)}</h1>
        <p style="color:#c9c2d2;line-height:1.65;font-size:16px;margin:22px 0 30px">${escapeHtml(message)}</p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#d88cff;color:#050505;text-decoration:none;border-radius:999px;padding:14px 18px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(cta)}</a>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,.1);padding:20px 34px;color:#8f8797;font-size:12px;line-height:1.55">
        Recibes este correo porque aceptaste comunicaciones de IAMJOSHWA / AFTERLUV.
        <br><a href="${escapeHtml(`${origin}/perfil`)}" style="color:#d8c6ff">Cambiar preferencias</a>
        · <a href="${escapeHtml(unsubscribe)}" style="color:#d8c6ff">Cancelar suscripción</a>
      </div>
    </div>
  </div>
</body></html>`;
  return { html, text, unsubscribeUrl: unsubscribe };
}

function internalUrl(path: string | undefined, origin: string) {
  if (!path || !path.startsWith("/")) return `${origin}/perfil`;
  return `${origin}${path}`;
}

function defaultMessage(templateKey?: string | null) {
  const map: Record<string, string> = {
    new_event: "Una nueva fecha acaba de activarse en la plataforma oficial.",
    event_7d: "Falta una semana para la siguiente señal en vivo.",
    event_24h: "Mañana nos vemos. Revisa horarios, venue y acceso.",
    event_2h: "La noche está cerca. Ten tu acceso, mapa y detalles listos.",
    last_tickets: "Últimos boletos disponibles para la próxima fecha.",
    presave: "El pre-save ya está activo.",
    release_available: "La nueva música ya está disponible en plataformas.",
    new_set: "Hay un nuevo set listo para escuchar.",
    exclusive: "Nuevo contenido exclusivo disponible para el Inner Circle.",
    post_event: "Gracias por vivir la última señal. Revisa fotos, sets y nuevas señales en la plataforma.",
  };
  return map[templateKey || ""] || "Tienes una nueva señal de IAMJOSHWA / AFTERLUV.";
}

function defaultCta(templateKey?: string | null) {
  if (templateKey?.includes("event")) return "Ver fecha";
  if (templateKey?.includes("release") || templateKey === "presave") return "Abrir lanzamiento";
  if (templateKey === "new_set") return "Escuchar set";
  if (templateKey === "exclusive") return "Entrar al Vault";
  if (templateKey === "post_event") return "Revive la fecha";
  return "Abrir señal";
}

function eyebrowFor(templateKey?: string | null) {
  if (templateKey?.includes("event")) return "LIVE SIGNAL";
  if (templateKey?.includes("release") || templateKey === "presave") return "NEW MUSIC";
  if (templateKey === "new_set") return "NOW PLAYING";
  if (templateKey === "exclusive") return "THE VAULT";
  if (templateKey === "post_event") return "POST SHOW";
  return "IAMJOSHWA SIGNAL";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}
