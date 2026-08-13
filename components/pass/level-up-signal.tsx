"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getLevelConfig } from "@/config/levels";

type Props = {
  level: string;
  memberNumber: string;
  points: number;
};

export function LevelUpSignal({ level, memberNumber, points }: Props) {
  const levelConfig = getLevelConfig(level);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = "iamjoshwa:last-pass-level";
    const previous = window.localStorage.getItem(key);

    if (previous && previous !== levelConfig.key) {
      const openTimer = window.setTimeout(() => setVisible(true), 80);
      const closeTimer = window.setTimeout(() => setVisible(false), 5200);
      window.localStorage.setItem(key, levelConfig.key);
      return () => {
        window.clearTimeout(openTimer);
        window.clearTimeout(closeTimer);
      };
    }

    window.localStorage.setItem(key, levelConfig.key);
  }, [levelConfig.key]);

  if (!visible) return null;

  return (
    <div
      className="level-up-overlay"
      role="status"
      aria-live="polite"
      style={
        {
          "--pass-level-color": levelConfig.color,
          "--pass-level-glow": levelConfig.glow,
        } as CSSProperties
      }
    >
      <div className="level-up-card">
        <span>LEVEL UP</span>
        <h2>{levelConfig.label}</h2>
        <p>Tu señal subió de nivel. Member #{memberNumber} · {points.toLocaleString("es-MX")} XP.</p>
        <button type="button" className="button secondary" onClick={() => setVisible(false)}>
          Seguir explorando
        </button>
      </div>
    </div>
  );
}
