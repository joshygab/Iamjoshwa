"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Play, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { useUniverse } from "./universe-provider";
import { Countdown } from "./countdown";
import { TrackedLink } from "./tracked-link";
import type { ReleaseItem } from "@/types/content";

export function ReleaseLibrary({ items }: { items: ReleaseItem[] }) {
  const { universe } = useUniverse();

  async function presave(item: ReleaseItem) {
    if (!isSupabaseConfigured || item.demo) return;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    await db.rpc("record_fan_action", { p_action: "presave_click", p_source_id: item.id });
  }

  const visible = items.filter((item) => item.universe === universe);
  if (!visible.length) {
    return (
      <div className="admin-empty public-empty branded-empty">
        <span>NEXT DROP</span>
        <h2>NEW MUSIC INCOMING.</h2>
        <p>El siguiente lanzamiento todavía está en cola. Activa tu Pass para recibir pre-save, links y transmisión de salida.</p>
      </div>
    );
  }

  return (
    <div className="release-grid">
      {visible.map((item) => {
        const future = new Date(item.releaseAt) > new Date();
        const primaryHref = future ? item.presaveUrl : item.listenUrl || item.platforms?.[0]?.url;
        const platformLinks = item.platforms || [];

        return (
          <article className="release-card release-card-premium reveal is-visible" key={item.id}>
            <div className="release-cover">
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt={`Portada de ${item.title}`} fill sizes="(max-width:760px) 100vw, 42vw" />
              ) : (
                <span>{item.title}</span>
              )}
              <span className="demo-badge">{item.demo ? "LANZAMIENTO DEMO" : future ? "PRÓXIMAMENTE" : "DISPONIBLE"}</span>
            </div>
            <div>
              <span>{item.type}</span>
              <h2>{item.title}</h2>
              <p>{item.story || "La historia oficial de este lanzamiento está reservada para la siguiente transmisión."}</p>
              {future ? (
                <Countdown
                  targetDate={item.releaseAt}
                  type={item.universe === "afterluv" ? "afterluv" : "release"}
                  label={item.universe === "afterluv" ? "TRANSMISSION BEGINS IN" : "DROPS IN"}
                  title={item.title}
                  compact
                  source="release_library"
                  contentId={item.id}
                  contentType="release"
                  completedLabel="OUT NOW"
                  completedTitle={item.title}
                  completedHref={item.listenUrl || item.platforms?.[0]?.url}
                  completedCta="Listen"
                />
              ) : <p className="release-live"><Sparkles /> Ya disponible en plataformas.</p>}
              {item.credits?.length ? <p className="muted">{item.credits.join(" · ")}</p> : null}

              <div className="inline-actions">
                <Link className="button secondary" href={`/lanzamientos/${item.slug}`}>
                  Ver ficha
                </Link>
                {primaryHref ? (
                  <TrackedLink className="button primary" href={primaryHref} onClick={() => future && void presave(item)} target="_blank" rel="noreferrer" action={future ? "presave_click" : "release_listen_click"} entityType="releases" entityId={item.id} label={item.title}>
                    {future ? "Haz pre-save" : "Escuchar ahora"} <Play />
                  </TrackedLink>
                ) : (
                  <button className="button primary" disabled>
                    {future ? "Pre-save queued" : "Links queued"}
                  </button>
                )}
              </div>

              {platformLinks.length ? (
                <div className="platform-grid" aria-label={`Plataformas de ${item.title}`}>
                  {platformLinks.map((link) => (
                    <TrackedLink key={`${item.id}-${link.label}`} href={link.url} target="_blank" rel="noreferrer" action="platform_click" entityType="releases" entityId={item.id} label={link.label}>
                      <span>{link.label}</span>
                      <ExternalLink />
                    </TrackedLink>
                  ))}
                </div>
              ) : (
                <p className="form-note">Platform links queued. Spotify, Apple Music, YouTube y SoundCloud pueden activarse desde Admin → Lanzamientos.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
