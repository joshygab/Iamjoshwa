export type CountdownUnit = {
  key: "days" | "hours" | "minutes" | "seconds";
  label: string;
  shortLabel: string;
  value: number;
};

export type CountdownState = {
  valid: boolean;
  complete: boolean;
  distanceMs: number;
  far: boolean;
  units: CountdownUnit[];
  ariaLabel: string;
};

export function dateToTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function getCountdownState(target: string | Date | null | undefined, now: number): CountdownState {
  const targetTime = dateToTime(target);
  const safeNow = Number.isFinite(now) && now > 0 ? now : Date.now();
  if (!targetTime || !Number.isFinite(safeNow) || safeNow <= 0) {
    return { valid: Boolean(targetTime), complete: false, distanceMs: 0, far: true, units: placeholderUnits(), ariaLabel: "Cuenta regresiva cargando" };
  }

  const distanceMs = Math.max(0, targetTime - safeNow);
  const complete = distanceMs <= 0;
  const totalSeconds = Math.floor(distanceMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const far = days >= 1;
  const units: CountdownUnit[] = far
    ? [
        { key: "days", label: "DAYS", shortLabel: "D", value: days },
        { key: "hours", label: "HOURS", shortLabel: "H", value: hours },
        { key: "minutes", label: "MIN", shortLabel: "M", value: minutes },
      ]
    : [
        { key: "hours", label: "HOURS", shortLabel: "H", value: Math.floor(totalSeconds / 3600) },
        { key: "minutes", label: "MIN", shortLabel: "M", value: minutes },
        { key: "seconds", label: "SEC", shortLabel: "S", value: seconds },
      ];

  return {
    valid: true,
    complete,
    distanceMs,
    far,
    units,
    ariaLabel: complete
      ? "Cuenta regresiva finalizada"
      : units.map((unit) => `${unit.value} ${unit.label.toLowerCase()}`).join(", "),
  };
}

export function getRewardUnlockAt(requirements: unknown) {
  if (!requirements || typeof requirements !== "object" || !("unlock_at" in requirements)) return null;
  const value = (requirements as Record<string, unknown>).unlock_at;
  return typeof value === "string" ? value : null;
}

function placeholderUnits(): CountdownUnit[] {
  return [
    { key: "days", label: "DAYS", shortLabel: "D", value: 0 },
    { key: "hours", label: "HOURS", shortLabel: "H", value: 0 },
    { key: "minutes", label: "MIN", shortLabel: "M", value: 0 },
  ];
}
