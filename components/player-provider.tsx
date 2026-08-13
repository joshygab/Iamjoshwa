"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
  Volume2,
  X,
} from "lucide-react";
import type { SetItem } from "@/types/content";

type Playing = Pick<
  SetItem,
  "id" | "slug" | "title" | "category" | "coverUrl" | "embedUrl" | "externalUrl" | "provider"
>;

type Value = {
  playing: Playing | null;
  active: boolean;
  expanded: boolean;
  volume: number;
  play: (item: Playing) => void;
  toggle: () => void;
  close: () => void;
  setExpanded: (expanded: boolean) => void;
  setVolume: (volume: number) => void;
};

const STORAGE_KEY = "iamjoshwa:now-playing:v1";
const Context = createContext<Value | null>(null);
type PlayerSnapshot = {
  playing: Playing | null;
  active: boolean;
  expanded: boolean;
  volume: number;
};

const defaultSnapshot: PlayerSnapshot = {
  playing: null,
  active: false,
  expanded: false,
  volume: 82,
};

function readStoredSnapshot(): PlayerSnapshot {
  if (typeof window === "undefined") return defaultSnapshot;
  try {
    const snapshot = window.localStorage.getItem(STORAGE_KEY);
    if (!snapshot) return defaultSnapshot;
    const parsed = JSON.parse(snapshot) as Partial<PlayerSnapshot>;
    return {
      playing: parsed.playing ?? null,
      active: Boolean(parsed.active),
      expanded: Boolean(parsed.expanded),
      volume: typeof parsed.volume === "number" ? parsed.volume : defaultSnapshot.volume,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultSnapshot;
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [{ playing, active, expanded, volume }, setSnapshot] =
    useState<PlayerSnapshot>(readStoredSnapshot);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ playing, active, expanded, volume }),
    );
  }, [active, expanded, playing, volume]);

  const value = useMemo<Value>(
    () => ({
      playing,
      active,
      expanded,
      volume,
      play: (item) => {
        setSnapshot((current) => ({
          ...current,
          playing: item,
          active: true,
          expanded: Boolean(item.embedUrl),
        }));
      },
      toggle: () => setSnapshot((current) => ({ ...current, active: !current.active })),
      close: () => {
        setSnapshot((current) => ({
          ...current,
          active: false,
          expanded: false,
          playing: null,
        }));
      },
      setExpanded: (nextExpanded) =>
        setSnapshot((current) => ({ ...current, expanded: nextExpanded })),
      setVolume: (nextVolume) =>
        setSnapshot((current) => ({
          ...current,
          volume: Math.min(100, Math.max(0, nextVolume)),
        })),
    }),
    [active, expanded, playing, volume],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <CompactPlayer />
    </Context.Provider>
  );
}

export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error("usePlayer requiere PlayerProvider");
  return value;
}

function CompactPlayer() {
  const { playing, active, expanded, volume, close, setExpanded, setVolume, toggle } =
    usePlayer();

  if (!playing) return null;

  const fullPlayerHref = playing.slug ? `/musica/${playing.slug}` : playing.externalUrl || "/musica";
  const providerLabel = playing.provider ? playing.provider.toUpperCase() : "OFICIAL";
  const canExpand = Boolean(playing.embedUrl);

  return (
    <aside
      className={`compact-player global-now-playing ${active ? "is-active" : ""} ${expanded ? "expanded" : ""}`}
      aria-label="Now Playing Global"
    >
      <div className="compact-player-artwork" aria-hidden="true">
        {playing.coverUrl ? (
          <Image src={playing.coverUrl} alt="" width={64} height={64} sizes="64px" />
        ) : (
          <span>IJ</span>
        )}
      </div>

      <div className="compact-player-body">
        <div className="compact-player-meta">
          <span>NOW PLAYING · {providerLabel}</span>
          <strong>{playing.title}</strong>
          <small>{playing.category}</small>
        </div>

        <div className="compact-player-signal" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, index) => (
            <span key={index} style={{ "--wave-index": index } as React.CSSProperties} />
          ))}
        </div>

        <div className="now-playing-progress" aria-label="Progreso visual de sesión">
          <span />
        </div>
      </div>

      <div className="compact-player-controls">
        <button
          type="button"
          className="compact-player-primary"
          onClick={toggle}
          aria-label={active ? "Pausar visualización" : "Reanudar visualización"}
        >
          {active ? <Pause /> : <Play />}
        </button>

        <label className="compact-player-volume">
          <Volume2 aria-hidden="true" />
          <span className="sr-only">Volumen preferido del reproductor</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>

        <Link href={fullPlayerHref} className="compact-player-link" aria-label="Abrir player completo">
          <ExternalLink />
        </Link>

        {canExpand ? (
          <button
            type="button"
            aria-label={expanded ? "Contraer reproductor oficial" : "Abrir reproductor oficial"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown /> : <ChevronUp />}
          </button>
        ) : null}

        <button type="button" aria-label="Cerrar Now Playing" onClick={close}>
          <X />
        </button>
      </div>

      {expanded && playing.embedUrl ? (
        <iframe
          src={playing.embedUrl}
          title={`Reproductor oficial de ${playing.title}`}
          loading="lazy"
          allow="encrypted-media; fullscreen; picture-in-picture"
        />
      ) : null}
    </aside>
  );
}
