"use client";

import Image from "next/image";
import { ExternalLink, Play, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { useUniverse } from "./universe-provider";
import { Countdown } from "./countdown";
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
      <div className="admin-empty public-empty">
        <h2>Sin lanzamientos publicados.</h2>
        <p>Cuando publiques una canción desde el admin aparecerá aquí automáticamente.</p>
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
              <p>{item.story || "Historia del lanzamiento pendiente de publicar."}</p>
              {future ? <Countdown date={item.releaseAt} /> : <p className="release-live"><Sparkles /> Ya disponible en plataformas.</p>}
              {item.credits?.length ? <p className="muted">{item.credits.join(" · ")}</p> : null}

              <div className="inline-actions">
                {primaryHref ? (
                  <a className="button primary" href={primaryHref} onClick={() => future && void presave(item)} target="_blank" rel="noreferrer">
                    {future ? "Haz pre-save" : "Escuchar ahora"} <Play />
                  </a>
                ) : (
                  <button className="button primary" disabled>
                    {future ? "Pre-save pendiente" : "Enlaces pendientes"}
                  </button>
                )}
              </div>

              {platformLinks.length ? (
                <div className="platform-grid" aria-label={`Plataformas de ${item.title}`}>
                  {platformLinks.map((link) => (
                    <a key={`${item.id}-${link.label}`} href={link.url} target="_blank" rel="noreferrer">
                      <span>{link.label}</span>
                      <ExternalLink />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="form-note">Agrega links de Spotify, Apple Music, YouTube u otras plataformas desde Admin → Lanzamientos.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
