"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Universe } from "@/types/content";

type ContextValue = { universe: Universe; setUniverse: (value: Universe) => void };
const UniverseContext = createContext<ContextValue | null>(null);
const universeEvent = "iamjoshwa-universe-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(universeEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(universeEvent, callback); };
}

function getSnapshot(): Universe { return localStorage.getItem("iamjoshwa-universe") === "afterluv" ? "afterluv" : "iamjoshwa"; }
function getServerSnapshot(): Universe { return "iamjoshwa"; }

export function UniverseProvider({ children }: { children: React.ReactNode }) {
  const universe = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setUniverse = (value: Universe) => { localStorage.setItem("iamjoshwa-universe", value); window.dispatchEvent(new Event(universeEvent)); };
  const value = useMemo(() => ({ universe, setUniverse }), [universe]);
  return <UniverseContext.Provider value={value}><div data-universe={universe}>{children}</div></UniverseContext.Provider>;
}

export function useUniverse() { const context = useContext(UniverseContext); if (!context) throw new Error("useUniverse requiere UniverseProvider"); return context; }
