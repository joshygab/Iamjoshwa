"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, Gift, LockKeyhole, Radio, ShieldCheck, Sparkles, Timer, Zap } from "lucide-react";
import { useUniverse } from "./universe-provider";
import type { RewardItem } from "@/types/content";

const vaultTypes = [
  { title: "Demos", body: "Ideas en proceso, bocetos y versiones tempranas cuando estén autorizadas.", icon: Radio },
  { title: "Edits & Mashups", body: "Versiones para club y momentos especiales. Sin publicar contenido no autorizado.", icon: Zap },
  { title: "Extended Cuts", body: "Versiones largas, intros, tools y descargas limitadas desde recompensas.", icon: Download },
  { title: "Private Sets", body: "Sets exclusivos desbloqueables con puntos verificados o campañas.", icon: LockKeyhole },
];

export function VaultExperience({ rewards, balance, signedIn }: { rewards: RewardItem[]; balance: number | null; signedIn: boolean }) {
  const { universe } = useUniverse();
  const visibleRewards = rewards.filter((item) => !item.project || item.project === universe);

  return (
    <div className="vault-experience">
      <section className="vault-hero-panel">
        <div className="vault-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <span className="section-kicker">THE VAULT · {universe.toUpperCase()}</span>
          <h1>Contenido que no vive en la superficie.</h1>
          <p>Demos, edits, mashups, versiones extendidas, sets privados y drops limitados. Todo se publica desde el admin o como recompensa: solo contenido autorizado y listo para compartir.</p>
          <div className="inline-actions">
            {signedIn ? (
              <Link className="button primary" href="/recompensas">
                <Gift /> Canjear acceso
              </Link>
            ) : (
              <Link className="button primary" href="/acceso?next=%2Fthe-vault">
                <Sparkles /> Crear IAMJOSHWA Pass
              </Link>
            )}
            <Link className="button secondary" href="/musica">
              <Radio /> Escuchar sets públicos
            </Link>
          </div>
        </div>
        <aside className="vault-pass-panel">
          <span>{signedIn ? "PASS ACTIVO" : "PASS REQUIRED"}</span>
          <strong>{balance ?? "—"}</strong>
          <small>{signedIn ? "puntos disponibles" : "inicia sesión para ver saldo"}</small>
          <div className="vault-scanline" />
        </aside>
      </section>

      <section className="vault-type-grid">
        {vaultTypes.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title}>
              <Icon />
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>

      <section className="vault-drop-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">DROPS DESBLOQUEABLES</span>
            <h2>Accesos publicados desde el CMS.</h2>
          </div>
          <ShieldCheck />
        </div>
        {visibleRewards.length ? (
          <div className="vault-drop-grid">
            {visibleRewards.map((item) => (
              <article className="vault-drop-card" key={item.id}>
                <div className="vault-drop-art">
                  {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 760px) 100vw, 33vw" /> : <span>{item.project?.toUpperCase() || "VAULT"}</span>}
                  <small>{item.inventory === null ? "DIGITAL" : `${item.inventory} DISPONIBLES`}</small>
                </div>
                <div>
                  <span>{item.pointsCost} puntos</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <Link className="button secondary" href={signedIn ? "/recompensas" : "/acceso?next=%2Frecompensas"}>
                    {signedIn ? "Abrir recompensas" : "Iniciar sesión"} <ArrowRight />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="vault-empty-state">
            <LockKeyhole />
            <h2>El Vault está listo, pero aún no hay drops publicados.</h2>
            <p>Cuando subas recompensas, demos autorizados, edits, PDFs, sets privados o descargas limitadas desde el admin, aparecerán aquí sin editar código.</p>
            <Link className="button primary" href="/admin/recompensas">Administrar drops</Link>
          </div>
        )}
      </section>

      <section className="vault-rules">
        <article><Timer /><strong>Acceso limitado</strong><span>Los drops pueden tener inventario, fecha límite o costo en puntos.</span></article>
        <article><ShieldCheck /><strong>Seguro por servidor</strong><span>Los puntos y canjes se procesan con funciones seguras, no desde el frontend.</span></article>
        <article><LockKeyhole /><strong>Contenido oficial</strong><span>El Vault no reproduce ni descarga material que no haya sido publicado y autorizado.</span></article>
      </section>
    </div>
  );
}
