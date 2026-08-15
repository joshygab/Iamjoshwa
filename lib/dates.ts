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

export const MX_TIME_ZONE = "America/Mexico_City";

export function dateToTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

export function formatMxDateTime(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  return formatMx(value, Object.keys(options).length ? options : { dateStyle: "medium", timeStyle: "short" });
}

export function formatMxDate(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  return formatMx(value, Object.keys(options).length ? options : { dateStyle: "medium" });
}

export function formatMxTime(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  return formatMx(value, Object.keys(options).length ? options : { hour: "2-digit", minute: "2-digit" });
}

export function formatMxInputDateTime(value: string | Date | null | undefined) {
  const date = parseDate(value);
  if (!date) return "";
  const parts = mxParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function mexicoLocalDateTimeToIso(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "invalid-date" : parsed.toISOString();
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "invalid-date" : parsed.toISOString();
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const localUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  let utc = localUtc;
  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utc), MX_TIME_ZONE);
    const next = localUtc - offset;
    if (Math.abs(next - utc) < 1000) {
      utc = next;
      break;
    }
    utc = next;
  }
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? "invalid-date" : result.toISOString();
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

function formatMx(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("es-MX", { timeZone: MX_TIME_ZONE, ...options }).format(date);
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mxParts(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: MX_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return zonedAsUtc - date.getTime();
}
