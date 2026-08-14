"use client";

import { Headphones, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { usePlayer } from "./player-provider";
import { TrackedLink } from "./tracked-link";
import type { SetItem } from "@/types/content";

export function SetDetailActions({ item, shareUrl }: { item: SetItem; shareUrl: string }) {
  const { play } = usePlayer();
  const artistName = item.universe === "afterluv" ? "AFTERLUV" : "IAMJOSHWA";
  const canOpenPlayer = Boolean(item.audioUrl || item.embedUrl);
  const externalOnly = Boolean(!canOpenPlayer && item.externalUrl);

  async function openSet() {
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
    <div className="inline-actions">
      {item.exclusive ? (
        <button className="button secondary" disabled>Exclusivo</button>
      ) : externalOnly ? (
        <TrackedLink className="button primary" href={item.externalUrl!} target="_blank" rel="noreferrer" action="set_platform_click" entityType="sets" entityId={item.id} label={item.title}>
          <Headphones /> Abrir plataforma
        </TrackedLink>
      ) : (
        <button className="button primary" onClick={() => void openSet()} disabled={!canOpenPlayer}>
          <Headphones /> {item.audioUrl ? "Reproducir set" : item.embedUrl ? "Abrir reproductor" : "Audio signal queued"}
        </button>
      )}
      {item.externalUrl && !item.demo && !externalOnly ? (
        <TrackedLink className="button secondary" href={item.externalUrl} target="_blank" rel="noreferrer" action="set_platform_click" entityType="sets" entityId={item.id} label={item.title}>
          Plataforma oficial
        </TrackedLink>
      ) : null}
      <a className="button secondary" href={`https://wa.me/?text=${encodeURIComponent(`Escucha este set de ${artistName}: ${shareUrl}`)}`} target="_blank" rel="noreferrer">
        Compartir <Share2 />
      </a>
    </div>
  );
}
