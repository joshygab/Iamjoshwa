"use client";
import { useUniverse } from "./universe-provider";

export function UniverseSwitch() {
  const { universe, setUniverse } = useUniverse();
  return <div className="universe-switch" role="group" aria-label="Cambiar universo musical">
    {(["iamjoshwa", "afterluv"] as const).map((item) => <button key={item} onClick={() => setUniverse(item)} aria-pressed={universe === item}>{item.toUpperCase()}</button>)}
  </div>;
}
