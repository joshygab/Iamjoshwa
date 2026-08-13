"use client";

import { Pause, Play } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useMemo, useRef, useState } from "react";

type Props = {
  src: string;
  mimeType?: string;
  title: string;
  eyebrow?: string;
  compact?: boolean;
  onPlay?: () => void;
};

const bars = Array.from({ length: 48 }, (_, index) => {
  const wave = Math.sin(index * 0.55) * 0.5 + Math.sin(index * 1.2) * 0.22 + 0.58;
  return Math.max(18, Math.min(96, Math.round(wave * 74)));
});

export function AudioWavePlayer({ src, mimeType, title, eyebrow = "OFFICIAL AUDIO", compact = false, onPlay }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState("");
  const progress = duration > 0 ? current / duration : 0;

  const timeLabel = useMemo(() => `${formatTime(current)} / ${duration ? formatTime(duration) : "--:--"}`, [current, duration]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        onPlay?.();
      } catch {
        setError("No fue posible iniciar el audio. Intenta de nuevo.");
      }
    } else {
      audio.pause();
    }
  }

  function seek(event: MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = next * duration;
    setCurrent(audio.currentTime);
  }

  return (
    <div className={`audio-wave-player ${compact ? "is-compact" : ""}`}>
      <audio
        key={src}
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setPlaying(false);
          setCurrent(0);
          setDuration(event.currentTarget.duration || 0);
          setError("");
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError("No se pudo cargar el audio. Revisa el archivo en Media Studio.")}
      >
        <source src={src} type={mimeType || "audio/mpeg"} />
      </audio>
      <button type="button" className="audio-wave-play" onClick={toggle} aria-label={playing ? `Pausar ${title}` : `Reproducir ${title}`}>
        {playing ? <Pause /> : <Play />}
      </button>
      <div className="audio-wave-main">
        <div className="audio-wave-head">
          <span>{eyebrow}</span>
          <strong>{title}</strong>
          <small>{timeLabel}</small>
        </div>
        <div className="audio-wave-bars" role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={`Progreso de ${title}`} onClick={seek}>
          {bars.map((height, index) => {
            const active = index / bars.length <= progress;
            return <span key={index} className={active ? "is-active" : undefined} style={{ "--bar-height": `${height}%`, "--bar-index": index } as CSSProperties} />;
          })}
        </div>
        {error ? <p className="audio-wave-error">{error}</p> : null}
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "--:--";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
