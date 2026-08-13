export const LEVEL_CONFIG = {
  listener: {
    key: "listener",
    id: 1,
    label: "Listener",
    color: "#A8A8A8",
    softColor: "rgba(168,168,168,.16)",
    glow: "rgba(168,168,168,.18)",
    minPoints: 0,
    personality: "Entrada limpia al universo.",
  },
  inner_circle: {
    key: "inner_circle",
    id: 2,
    label: "Inner Circle",
    color: "#4D7CFE",
    softColor: "rgba(77,124,254,.16)",
    glow: "rgba(77,124,254,.22)",
    minPoints: 100,
    personality: "Acceso, comunidad y pertenencia.",
  },
  raver: {
    key: "raver",
    id: 3,
    label: "Raver",
    color: "#B7FF3C",
    softColor: "rgba(183,255,60,.14)",
    glow: "rgba(183,255,60,.2)",
    minPoints: 350,
    personality: "Energía, club y movimiento.",
  },
  afterlover: {
    key: "afterlover",
    id: 4,
    label: "Afterlover",
    color: "#9B5CFF",
    softColor: "rgba(155,92,255,.16)",
    glow: "rgba(155,92,255,.24)",
    minPoints: 800,
    personality: "Noche, misterio y AFTERLUV.",
  },
  day_one: {
    key: "day_one",
    id: 5,
    label: "Day One",
    color: "#FF9D3D",
    softColor: "rgba(255,157,61,.15)",
    glow: "rgba(255,157,61,.2)",
    minPoints: 1600,
    personality: "Antigüedad, exclusividad y memoria.",
  },
  legend: {
    key: "legend",
    id: 6,
    label: "Legend",
    color: "#E8C66A",
    softColor: "rgba(232,198,106,.16)",
    glow: "rgba(232,198,106,.22)",
    minPoints: 3000,
    personality: "Prestigio, constancia y máximo estatus.",
  },
} as const;

export const LEVEL_ORDER = ["listener", "inner_circle", "raver", "afterlover", "day_one", "legend"] as const;

export type PassLevelKey = (typeof LEVEL_ORDER)[number];
export type PassLevelConfig = (typeof LEVEL_CONFIG)[PassLevelKey];

const LEVEL_ALIASES: Record<string, PassLevelKey> = {
  listener: "listener",
  inner_circle: "inner_circle",
  innercircle: "inner_circle",
  raver: "raver",
  afterlover: "afterlover",
  after_lover: "afterlover",
  day_one: "day_one",
  dayone: "day_one",
  legend: "legend",
};

export function normalizeLevelKey(level: string | null | undefined): PassLevelKey {
  const cleaned = String(level || "listener")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return LEVEL_ALIASES[cleaned] || "listener";
}

export function getLevelConfig(level: string | null | undefined): PassLevelConfig {
  return LEVEL_CONFIG[normalizeLevelKey(level)];
}

export function getLevelColor(level: string | null | undefined) {
  return getLevelConfig(level).color;
}

export function getLevelNumber(level: string | null | undefined) {
  return getLevelConfig(level).id;
}

export function getNextLevel(level: string | null | undefined): PassLevelConfig | null {
  const key = normalizeLevelKey(level);
  const index = LEVEL_ORDER.indexOf(key);
  const nextKey = LEVEL_ORDER[index + 1];
  return nextKey ? LEVEL_CONFIG[nextKey] : null;
}

export function getLevelFromPoints(points: number): PassLevelConfig {
  const safePoints = Number.isFinite(points) ? points : 0;
  const key = LEVEL_ORDER.slice().reverse().find((item) => safePoints >= LEVEL_CONFIG[item].minPoints) || "listener";
  return LEVEL_CONFIG[key];
}

export function getNextLevelFromPoints(points: number): PassLevelConfig | null {
  const safePoints = Number.isFinite(points) ? points : 0;
  const key = LEVEL_ORDER.find((item) => LEVEL_CONFIG[item].minPoints > safePoints);
  return key ? LEVEL_CONFIG[key] : null;
}
