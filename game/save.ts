import type { RunSnapshot, SaveData, UpgradeState } from "./types";

export const SAVE_KEY = "last-floor-save-v1";

const emptyStats = {
  totalRuns: 0,
  totalFloors: 0,
  bestFloor: 0,
  bestScore: 0,
  previousScore: 0,
  coinsEarned: 0,
  puzzlesSolved: 0,
  enemiesDefeated: 0,
  deaths: 0,
  perfectFloors: 0,
  fastestFloor: 9999,
  bestCombo: 0,
  bossWins: 0,
  dailyBestFloor: 0,
  dailyBestScore: 0,
  dailyDate: "",
};

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  coins: 420,
  shards: 0,
  keys: 1,
  upgrades: { HEALTH: 0, SPEED: 0, SHIELD: 0, LUCK: 0, ENERGY: 0 },
  ownedCosmetics: ["ROOKIE"],
  selectedCosmetic: "ROOKIE",
  achievements: [],
  stats: emptyStats,
  settings: { sound: true, volume: 0.5, reducedMotion: false },
  activeRun: null,
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function sanitizeUpgradeState(value: unknown): UpgradeState {
  const fallback = DEFAULT_SAVE.upgrades;
  if (!isObject(value)) return fallback;
  return {
    HEALTH: Math.max(0, Math.min(5, Number(value.HEALTH) || 0)),
    SPEED: Math.max(0, Math.min(8, Number(value.SPEED) || 0)),
    SHIELD: Math.max(0, Math.min(4, Number(value.SHIELD) || 0)),
    LUCK: Math.max(0, Math.min(8, Number(value.LUCK) || 0)),
    ENERGY: Math.max(0, Math.min(8, Number(value.ENERGY) || 0)),
  };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return structuredClone(DEFAULT_SAVE);
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      upgrades: sanitizeUpgradeState(parsed.upgrades),
      ownedCosmetics: Array.isArray(parsed.ownedCosmetics) ? parsed.ownedCosmetics as SaveData["ownedCosmetics"] : ["ROOKIE"],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.map(String) : [],
      stats: { ...DEFAULT_SAVE.stats, ...(isObject(parsed.stats) ? parsed.stats : {}) },
      settings: { ...DEFAULT_SAVE.settings, ...(isObject(parsed.settings) ? parsed.settings : {}) },
      activeRun: parsed.activeRun ?? null,
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function saveGame(save: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be blocked in private browsing; the game remains playable for the current session.
  }
}

export function resetSave(): SaveData {
  const fresh = structuredClone(DEFAULT_SAVE);
  saveGame(fresh);
  return fresh;
}

export function persistRun(save: SaveData, run: RunSnapshot | null): SaveData {
  const next = { ...save, activeRun: run };
  saveGame(next);
  return next;
}
