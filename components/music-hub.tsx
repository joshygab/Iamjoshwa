"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Disc3, ExternalLink, Headphones, Radio, Sparkles, Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { usePlayer } from "./player-provider";
import { useUniverse } from "./universe-provider";
import type { ReleaseItem, SetItem } from "@/types/content";

export function MusicHub({ sets, releases }: { sets: SetItem[]; releases: ReleaseItem[] }) {
  const { universe } = useUniverse();
  const { play } = usePlayer();
  const artistName = universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const visibleSets = sets.filter((item) => item.universe === universe);
  const visibleReleases = releases.filter((item) => item.universe === universe);
  const featuredSet = visibleSets.find((item) => item.featured) || visibleSets[0];
  const featuredRelease = visibleReleases[0];
  const platforms = Array.from(
    new Set(visibleReleases.flatMap((release) => release.platforms?.map((link) => link.label) || [])),
  ).slice(0, 6);

  async function openSet(item: SetItem) {
    play(item);
    if (!isSupabaseConfigured || item.demo) return;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    await db.rpc("record_fan_action", { p_action: "open_set", p_source_id: item.id });
  }

  return (
    <section className="music-hub-experience reveal is-visible" aria-label={`Music Hub de ${artistName}`}>
      <div className="music-hub-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="music-hub-copy">
        <span className="section-kicker">{artistName} MUSIC HUB</span>
        <h2>Un centro musical para escuchar, explorar y compartir.</h2>
        <p>
          Sets, lanzamientos, plataformas oficiales y contexto detrás de cada pieza. Todo preparado
          para crecer hacia puntos por escucha, drops privados y campañas sin cambiar la estructura.
        </p>

        <div className="music-hub-stats">
          <article>
            <Disc3 />
            <span>Sets publicados</span>
            <strong>{visibleSets.length}</strong>
          </article>
          <article>
            <Sparkles />
            <span>Lanzamientos</span>
            <strong>{visibleReleases.length}</strong>
          </article>
          <article>
            <Radio />
            <span>Universo activo</span>
            <strong>{artistName}</strong>
          </article>
        </div>
      </div>

      <div className="music-hub-console">
        {featuredSet ? (
          <article className="now-rotation-card">
            <div className="now-rotation-art">
              {featuredSet.coverUrl ? (
                <Image src={featuredSet.coverUrl} alt={`Portada de ${featuredSet.title}`} fill sizes="(max-width:900px) 100vw, 360px" />
              ) : (
                <span>{featuredSet.category}</span>
              )}
            </div>
            <div>
              <span>NOW IN ROTATION</span>
              <h3>{featuredSet.title}</h3>
              <p>{featuredSet.description || "Set oficial pendiente de descripción."}</p>
              <div className="inline-actions">
                {featuredSet.demo || featuredSet.exclusive ? (
                  <button className="button primary" disabled>
                    <Headphones /> Audio pendiente
                  </button>
                ) : (
                  <button className="button primary" onClick={() => void openSet(featuredSet)}>
                    <Headphones /> Listen
                  </button>
                )}
                <Link className="button secondary" href={`/musica/${featuredSet.slug}`}>
                  Ficha completa <ArrowRight />
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {featuredRelease ? (
          <article className="latest-drop-card">
            <Waves />
            <span>LATEST DROP</span>
            <h3>{featuredRelease.title}</h3>
            <p>{featuredRelease.story || "Historia editable desde el admin."}</p>
            <div className="inline-actions">
              <Link className="button secondary" href={`/lanzamientos/${featuredRelease.slug}`}>
                Ver lanzamiento
              </Link>
              {(featuredRelease.listenUrl || featuredRelease.presaveUrl || featuredRelease.platforms?.[0]?.url) ? (
                <a
                  className="text-link"
                  href={featuredRelease.listenUrl || featuredRelease.presaveUrl || featuredRelease.platforms?.[0]?.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Plataforma <ExternalLink />
                </a>
              ) : null}
            </div>
          </article>
        ) : null}

        <div className="platform-rail" aria-label="Plataformas disponibles">
          {(platforms.length ? platforms : ["Spotify", "Apple Music", "SoundCloud", "YouTube"]).map((platform) => (
            <span key={platform}>{platform}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
