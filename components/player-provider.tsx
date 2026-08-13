"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  "id" | "slug" | "title" | "category" | "coverUrl" | "audioUrl" | "audioMimeType" | "embedUrl" | "externalUrl" | "provider"
>;

type Value = {
  playing: Playing | null;
  active: boolean;
  expanded: boolean;
  volume: number;
  play: (item: Playing) => void;
  toggle: () => void;
  setActive: (active: boolean) => void;
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
      active: false,
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
      setActive: (nextActive) => setSnapshot((current) => ({ ...current, active: nextActive })),
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
  const { playing, active, expanded, volume, close, setActive, setExpanded, setVolume, toggle } =
    usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, playing?.audioUrl]);

  useEffect(() => {
    if (!playing?.audioUrl || !audioRef.current) return;
    if (active) {
      void audioRef.current.play().catch(() => setActive(false));
    } else {
      audioRef.current.pause();
    }
  }, [active, playing?.audioUrl, setActive]);

  if (!playing) return null;

  const fullPlayerHref = playing.slug ? `/musica/${playing.slug}` : playing.externalUrl || "/musica";
  const providerLabel = playing.provider ? playing.provider.toUpperCase() : "OFICIAL";
  const canExpand = Boolean(playing.embedUrl);
  const hasNativeAudio = Boolean(playing.audioUrl);
  const progress = duration > 0 ? current / duration : 0;

  function handlePrimary() {
    if (!hasNativeAudio) return toggle();
    if (audioRef.current && !active) void audioRef.current.play().catch(() => setActive(false));
    else audioRef.current?.pause();
    setActive(!active);
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = next * duration;
    setCurrent(audioRef.current.currentTime);
  }

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

        <div className={`compact-player-signal ${hasNativeAudio ? "is-seekable" : ""}`} aria-label="Waveform del set" onClick={hasNativeAudio ? seek : undefined}>
          {Array.from({ length: 28 }).map((_, index) => (
            <span key={index} className={hasNativeAudio && index / 28 <= progress ? "is-active" : undefined} style={{ "--wave-index": index } as React.CSSProperties} />
          ))}
        </div>

        <div className="now-playing-progress" aria-label="Progreso visual de sesión">
          <span style={hasNativeAudio ? { transform: `scaleX(${Math.max(0.03, progress)})` } : undefined} />
        </div>
        {hasNativeAudio ? <small className="compact-player-time">{formatTime(current)} / {duration ? formatTime(duration) : "--:--"}</small> : null}
      </div>

      <div className="compact-player-controls">
        <button
          type="button"
          className="compact-player-primary"
          onClick={handlePrimary}
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

      {playing.audioUrl ? (
        <audio
          ref={audioRef}
          className="compact-player-native-audio"
          preload="metadata"
          onLoadedMetadata={(event) => {
            setCurrent(0);
            setDuration(event.currentTarget.duration || 0);
          }}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          onPlay={() => setActive(true)}
          onPause={() => setActive(false)}
          onEnded={() => setActive(false)}
        >
          <source src={playing.audioUrl} type={playing.audioMimeType || "audio/mpeg"} />
        </audio>
      ) : null}

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

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "--:--";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
