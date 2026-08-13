"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { getCountdownState } from "@/lib/dates";

const listeners = new Set<() => void>();
let intervalId: number | null = null;
let currentNow = 0;

function tick() {
  currentNow = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    intervalId = window.setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
      currentNow = 0;
    }
  };
}

function getSnapshot() {
  return currentNow;
}

function getServerSnapshot() {
  return 0;
}

export function useCountdown(targetDate: string | Date | null | undefined) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => getCountdownState(targetDate, now), [now, targetDate]);

  useEffect(() => {
    if (!currentNow) tick();
  }, []);

  return { ...state, hydrated: now > 0, now };
}
