import Link from "next/link";
import { ArrowRight, BadgeCheck, Gift, Instagram, LockKeyhole, QrCode, Radio, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { contentRepository } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

const levels = [
  ["01", "Listener", "Entrada al universo, perfil y preferencias."],
  ["02", "Inner Circle", "Primeros desbloqueos por actividad verificada."],
  ["03", "Raver", "Check-ins, sets y acceso a drops seleccionados."],
  ["04", "Afterlover", "AFTERLUV, hard sessions y contenido más exclusivo."],
  ["05", "Day One", "Reconocimiento para fans constantes y referidos reales."],
  ["06", "Legend", "Acceso máximo, recompensas especiales y prioridad."],
];

export const generateMetadata = () => pageMetadata({
  path: "/comunidad",
  title: "Comunidad",
  description: "IAMJOSHWA Pass, niveles, puntos, badges, referidos y acceso a The Vault.",
});

export default async function CommunityPage() {
  const socials = await contentRepository.getSocialLinks();
  const instagram = socials.find((item) => item.platform?.toLowerCase() === "instagram" && (!item.project || item.project === "iamjoshwa"));
  const actions = [
    ["Completa tu perfil", "Tu identidad, ciudad, gustos y canal favorito.", BadgeCheck, "/perfil"],
    ["Escucha sets", "Abre sesiones oficiales y registra actividad segura.", Radio, "/musica"],
    ["Confirma asistencia", "Marca eventos y prepara tu check-in QR.", QrCode, "/fechas"],
    ["Sigue la señal", instagram ? "Conecta con Instagram y no te pierdas drops ni shows." : "Activa tu Pass; cuando agregues Instagram en Admin, esta misión abrirá tu perfil.", Instagram, instagram?.url || "/acceso?next=%2Fperfil"],
    ["Desbloquea Vault", "Canjea puntos por drops, edits y contenido privado.", LockKeyhole, "/the-vault"],
  ] as const;

  return (
    <>
      <PageHero
        kicker="JOSH PASS"
        title="No sigas la señal. Sé parte de ella."
        description="Una membresía digital para IAMJOSHWA y AFTERLUV: niveles, puntos, badges, QR, referidos, recompensas y acceso a The Vault."
      />

      <section className="section pass-community-hero">
        <div className="pass-community-card pro-community-pass">
          <div className="pass-card-shine" />
          <div className="community-pass-orbit" aria-hidden="true" />
          <div className="community-pass-top">
            <span>IAMJOSHWA PASS</span>
            <small>INNER CIRCLE ACCESS</small>
          </div>
          <div className="community-pass-name">
            <small>MEMBER PREVIEW</small>
            <strong>ACCESS<br />GRANTED</strong>
            <span>CDMX · MX · LEVEL 01</span>
          </div>
          <div className="community-pass-bottom">
            <div>
              <small>XP</small>
              <strong>035 / 100</strong>
            </div>
            <div className="community-pass-qr" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="community-pass-progress"><span /></div>
        </div>
        <div className="pass-community-copy">
          <span className="section-kicker">MEMBERSHIP SYSTEM</span>
          <h2>Tu pase no es solo un perfil. Es una llave.</h2>
          <p>
            El Pass conecta música, shows, check-ins, referidos, recompensas y contenido privado.
            Todo suma desde acciones verificadas por servidor: el frontend no puede regalarse puntos.
          </p>
          <div className="inline-actions">
            <Link className="button primary" href="/acceso?next=%2Fperfil">
              Crear mi Pass <Sparkles />
            </Link>
            <Link className="button secondary" href="/the-vault">
              Entrar a The Vault <LockKeyhole />
            </Link>
          </div>
        </div>
      </section>

      <section className="section pass-action-system">
        <div className="section-heading">
          <div>
            <span className="section-kicker">CÓMO SUBES DE NIVEL</span>
            <h2>Acciones reales, recompensas reales.</h2>
          </div>
          <p className="muted">Cada movimiento vive en un ledger, no en un total editable.</p>
        </div>
        <div className="pass-action-grid">
          {actions.map(([title, body, Icon, href]) => (
            <Link href={href} target={String(href).startsWith("http") ? "_blank" : undefined} rel={String(href).startsWith("http") ? "noreferrer" : undefined} key={String(title)}>
              <Icon />
              <h3>{String(title)}</h3>
              <p>{String(body)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section pass-levels premium-pass-levels">
        <span className="section-kicker">NIVELES</span>
        <h2>De oyente a leyenda.</h2>
        <div>
          {levels.map(([number, level, body]) => (
            <article key={level}>
              <strong>{number}</strong>
              <span>{level}</span>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section pass-vault-bridge">
        <div>
          <ShieldCheck />
          <span className="section-kicker">JOSH PASS → THE VAULT</span>
          <h2>El contenido exclusivo debe sentirse ganado.</h2>
          <p>
            The Vault queda preparado para demos autorizados, edits, mashups, extended cuts,
            sets privados, descargas limitadas y recompensas. Tú controlas qué se publica desde el admin.
          </p>
          <div className="inline-actions">
            <Link className="button primary" href="/the-vault">
              Ver Vault <ArrowRight />
            </Link>
            <Link className="text-link" href="/recompensas">
              Recompensas <Gift />
            </Link>
          </div>
        </div>
        <div className="pass-unlock-stack" aria-label="Flujo del fan">
          <article><Zap /><strong>Gana puntos</strong><span>Sets, pre-saves, eventos y referidos.</span></article>
          <article><Trophy /><strong>Desbloquea nivel</strong><span>Listener → Legend.</span></article>
          <article><LockKeyhole /><strong>Accede al Vault</strong><span>Drops publicados por el artista.</span></article>
        </div>
      </section>
    </>
  );
}
