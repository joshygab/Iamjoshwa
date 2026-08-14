"use client";

import { useEffect, useState } from "react";
import { AtSign, Disc3, ExternalLink, Facebook, Globe, Headphones, Instagram, MessageCircle, Music2, Radio, Youtube } from "lucide-react";
import { useUniverse } from "./universe-provider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

type SocialLink = {
  id: string;
  platform: string;
  label: string | null;
  url: string;
  project: "iamjoshwa" | "afterluv" | null;
  position: number | null;
};

export function SocialIconRail() {
  const { universe } = useUniverse();
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadLinks() {
      if (!isSupabaseConfigured) return;
      const db = createClient();
      const { data } = await db
        .from("social_links")
        .select("id,platform,label,url,project,position")
        .eq("active", true)
        .order("position");
      if (!cancelled) setLinks((data || []) as SocialLink[]);
    }
    void loadLinks();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = links.filter((item) => !item.project || item.project === universe);
  if (!visible.length) return null;

  return (
    <nav className="public-social-rail" aria-label="Redes sociales oficiales">
      {visible.map((item) => {
        const Icon = iconFor(item.platform);
        const label = item.label || platformLabel(item.platform);
        return (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={label} title={label} key={item.id}>
            {Icon ? <Icon /> : <span>{initials(item.platform)}</span>}
          </a>
        );
      })}
    </nav>
  );
}

function iconFor(platform: string) {
  const key = platform.toLowerCase().replace(/\s+/g, "_");
  return ({
    instagram: Instagram,
    youtube: Youtube,
    facebook: Facebook,
    whatsapp: MessageCircle,
    spotify: Headphones,
    apple_music: Music2,
    soundcloud: Radio,
    mixcloud: Disc3,
    beatport: Disc3,
    tiktok: AtSign,
    x: ExternalLink,
    website: Globe,
  } as Record<string, typeof Instagram | undefined>)[key];
}

function platformLabel(value: string) {
  return value.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(value: string) {
  return value.split(/[_\s-]+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
