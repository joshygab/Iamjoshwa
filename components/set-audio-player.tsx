"use client";

import { AudioWavePlayer } from "./audio-wave-player";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { SetItem } from "@/types/content";

export function SetAudioPlayer({ item }: { item: SetItem }) {
  async function recordListen() {
    if (!isSupabaseConfigured || item.demo) return;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    await db.rpc("record_fan_action", { p_action: "open_set", p_source_id: item.id });
  }

  if (!item.audioUrl) return null;
  return <AudioWavePlayer src={item.audioUrl} mimeType={item.audioMimeType} title={item.title} eyebrow="OFFICIAL SET AUDIO" onPlay={() => void recordListen()} />;
}
