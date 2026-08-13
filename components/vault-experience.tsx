"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Download, Gift, LockKeyhole, Radio, ShieldCheck, Sparkles, Timer, Trophy, UserPlus, Zap } from "lucide-react";
import { Countdown } from "./countdown";
import { useUniverse } from "./universe-provider";
import { dateToTime } from "@/lib/dates";
import type { RewardItem, SetItem } from "@/types/content";

const vaultTypes = [
  { title: "Demos", body: "Ideas en proceso, bocetos y versiones tempranas cuando estén autorizadas.", icon: Radio },
  { title: "Edits & Mashups", body: "Versiones para club y momentos especiales. Sin publicar contenido no autorizado.", icon: Zap },
  { title: "Extended Cuts", body: "Versiones largas, intros, tools y descargas limitadas desde recompensas.", icon: Download },
  { title: "Private Sets", body: "Sets exclusivos desbloqueables con puntos verificados o campañas.", icon: LockKeyhole },
];

const accessFlow = [
  { title: "Crea tu Pass", body: "Una cuenta para IAMJOSHWA y AFTERLUV.", icon: UserPlus },
  { title: "Gana puntos", body: "Escuchas, pre-saves, check-ins y referidos reales.", icon: Zap },
  { title: "Sube de nivel", body: "Listener, Inner Circle, Raver, Afterlover, Day One y Legend.", icon: Trophy },
  { title: "Acceso concedido", body: "Canjea drops publicados y autorizados desde el CMS.", icon: LockKeyhole },
];

export function VaultExperience({ rewards, sets = [], balance, signedIn, now }: { rewards: RewardItem[]; sets?: SetItem[]; balance: number | null; signedIn: boolean; now: number }) {
  const { universe } = useUniverse();
  const visibleRewards = rewards.filter((item) => !item.project || item.project === universe);
  const audioReadySets = sets.filter((item) => item.universe === universe && item.audioUrl).slice(0, 3);

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

      <section className="vault-pass-journey">
        <div>
          <BadgeCheck />
          <span className="section-kicker">JOSH PASS JOURNEY</span>
          <h2>El Vault se desbloquea con actividad real.</h2>
          <p>
            The Vault no es una carpeta pública escondida. Es una experiencia de membresía:
            el fan escucha, asiste, comparte, acumula puntos y canjea contenido cuando tú lo publiques.
          </p>
          <Link className="button secondary" href={signedIn ? "/perfil" : "/acceso?next=%2Fperfil"}>
            {signedIn ? "Ver mi Pass" : "Crear Pass"} <ArrowRight />
          </Link>
        </div>
        <div className="vault-journey-steps">
          {accessFlow.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon />
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="vault-audio-pipeline">
        <div>
          <Radio />
          <span className="section-kicker">AUDIO PIPELINE</span>
          <h2>Sets públicos, drops privados y futuras descargas en una sola arquitectura.</h2>
          <p>Los MP3/WAV que subas en Media Studio ya pueden alimentar el reproductor público. El siguiente paso natural es convertir ciertos audios en drops canjeables desde recompensas.</p>
        </div>
        <div>
          {audioReadySets.length ? audioReadySets.map((item) => (
            <Link href={`/musica/${item.slug}`} key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.category} · audio propio activo</span>
            </Link>
          )) : (
            <article>
              <strong>Audio signal queued</strong>
              <span>Los MP3/WAV autorizados pueden convertirse en señales privadas y crecer hacia The Vault.</span>
            </article>
          )}
        </div>
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
            {visibleRewards.map((item) => {
              const unlockTime = dateToTime(item.unlockAt);
              const expiresTime = dateToTime(item.expiresAt);
              const locked = Boolean(unlockTime && unlockTime > now);
              const expired = Boolean(expiresTime && expiresTime <= now);
              return (
                <article className={`vault-drop-card ${locked ? "is-locked" : ""} ${expired ? "is-expired" : ""}`} key={item.id}>
                  <div className="vault-drop-art">
                    {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 760px) 100vw, 33vw" /> : <span>{item.project?.toUpperCase() || "VAULT"}</span>}
                    <small>{expired ? "EXPIRED" : locked ? "LOCKED" : item.inventory === null ? "DIGITAL" : `${item.inventory} DISPONIBLES`}</small>
                  </div>
                  <div>
                    <span>{item.pointsCost} puntos</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {locked && item.unlockAt ? (
                      <Countdown targetDate={item.unlockAt} type="vault" label="UNLOCKS IN" title={item.name} compact source="vault" contentId={item.id} contentType="vault" completedLabel="AVAILABLE NOW" completedTitle={item.name} />
                    ) : expiresTime && !expired ? (
                      <Countdown targetDate={item.expiresAt} type="vault" label="EXPIRES IN" title="AVAILABLE NOW" compact source="vault" contentId={item.id} contentType="vault" completedLabel="EXPIRED" completedTitle={item.name} />
                    ) : expired ? (
                      <p className="vault-expired-label">EXPIRED</p>
                    ) : null}
                    <Link className="button secondary" aria-disabled={locked || expired} href={locked || expired ? "/the-vault" : signedIn ? "/recompensas" : "/acceso?next=%2Frecompensas"}>
                      {expired ? "Drop expirado" : locked ? "Aún bloqueado" : signedIn ? "Abrir recompensas" : "Iniciar sesión"} <ArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="vault-empty-state">
            <LockKeyhole />
            <h2>VAULT SEALED.</h2>
            <p>La primera señal privada todavía no fue liberada. Mantén tu Pass activo para recibir códigos, drops y accesos limitados.</p>
            <Link className="button primary" href={signedIn ? "/recompensas" : "/acceso?next=%2Fthe-vault"}>{signedIn ? "Ver recompensas" : "Activar Pass"}</Link>
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
