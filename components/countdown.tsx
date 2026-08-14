"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Radio } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";

export type CountdownType = "show" | "release" | "vault" | "afterluv" | "presale" | "generic";

type CountdownProps = {
  targetDate?: string | Date | null;
  date?: string | Date | null;
  type?: CountdownType;
  label?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  onComplete?: () => void;
  source?: string;
  contentId?: string;
  contentType?: string;
  completedLabel?: string;
  completedTitle?: string;
  completedSubtitle?: string;
  completedHref?: string;
  completedCta?: string;
};

export function Countdown({
  targetDate,
  date,
  type = "generic",
  label,
  title,
  subtitle,
  compact = false,
  onComplete,
  source = "unknown",
  contentId,
  contentType,
  completedLabel,
  completedTitle,
  completedSubtitle,
  completedHref,
  completedCta,
}: CountdownProps) {
  const resolvedTarget = targetDate ?? date ?? null;
  const state = useCountdown(resolvedTarget);
  const viewed = useRef(false);
  const completed = useRef(false);
  const finalType = contentType || type;
  const finalLabel = countdownMomentLabel(type, state.distanceMs, label || defaultLabel(type));
  const isAfterluv = type === "afterluv";

  useEffect(() => {
    if (!state.hydrated || !state.valid || viewed.current || state.complete) return;
    viewed.current = true;
    track("countdown_view", { source, contentType: finalType, contentId, type });
  }, [contentId, finalType, source, state.complete, state.hydrated, state.valid, type]);

  useEffect(() => {
    if (!state.hydrated || !state.valid || !state.complete || completed.current) return;
    completed.current = true;
    onComplete?.();
    track(`${type}_countdown_completed`, { source, contentType: finalType, contentId, type });
    track("countdown_completed", { source, contentType: finalType, contentId, type });
  }, [contentId, finalType, onComplete, source, state.complete, state.hydrated, state.valid, type]);

  if (!resolvedTarget || !state.valid) return null;

  if (state.complete) {
    if (!completedLabel && !completedTitle && !completedHref) return null;
    return (
      <div className={`premium-countdown is-complete countdown-${type} ${compact ? "is-compact" : ""}`} role="status" aria-live="polite">
        <div className="premium-countdown-copy">
          <span>{completedLabel || defaultCompleteLabel(type)}</span>
          {completedTitle ? <strong>{completedTitle}</strong> : null}
          {completedSubtitle ? <p>{completedSubtitle}</p> : null}
        </div>
        {completedHref ? (
          <Link className="button primary countdown-complete-cta" href={completedHref}>
            {completedCta || "Open"} <ArrowRight />
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`premium-countdown countdown-${type} ${compact ? "is-compact" : ""} ${isAfterluv ? "is-afterluv" : ""}`}
      aria-label={`${finalLabel}: ${state.ariaLabel}`}
    >
      <div className="premium-countdown-copy" aria-live="off">
        <span>{finalLabel}</span>
        {title ? <strong>{title}</strong> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="premium-countdown-units" aria-hidden="true">
        {state.units.map((unit, index) => (
          <div className="premium-countdown-unit" key={unit.key}>
            <strong>{String(unit.value).padStart(2, "0")}</strong>
            <span data-short={unit.shortLabel}>{unit.label}</span>
            {index < state.units.length - 1 ? <em>:</em> : null}
          </div>
        ))}
      </div>
      {isAfterluv ? (
        <div className="afterluv-transmission-line" aria-hidden="true">
          <Radio />
          <span />
        </div>
      ) : null}
    </div>
  );
}

function defaultLabel(type: CountdownType) {
  if (type === "show") return "NEXT SHOW";
  if (type === "release") return "DROPS IN";
  if (type === "vault") return "UNLOCKS IN";
  if (type === "afterluv") return "TRANSMISSION BEGINS IN";
  if (type === "presale") return "PRESALE OPENS IN";
  return "NEXT SIGNAL";
}

function countdownMomentLabel(type: CountdownType, distanceMs: number, fallback: string) {
  if (!["show", "afterluv"].includes(type) || distanceMs <= 0) return fallback;
  const hour = 60 * 60 * 1000;
  if (distanceMs <= 24 * hour) return "TONIGHT — SIGNAL IMMINENT";
  if (distanceMs <= 48 * hour) return "TOMORROW — SIGNAL IMMINENT";
  return fallback;
}

function defaultCompleteLabel(type: CountdownType) {
  if (type === "release") return "OUT NOW";
  if (type === "vault") return "AVAILABLE NOW";
  if (type === "presale") return "PRESALE ACTIVE";
  if (type === "show" || type === "afterluv") return "SIGNAL ACTIVE";
  return "LIVE";
}

function track(action: string, metadata: Record<string, unknown>) {
  const body = JSON.stringify({ action, entityType: String(metadata.contentType || "countdown"), entityId: metadata.contentId ? String(metadata.contentId) : undefined, label: String(metadata.type || "countdown"), metadata });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
  else void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
}
