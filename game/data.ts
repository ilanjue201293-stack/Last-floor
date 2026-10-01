import type {
  AbilityId,
  CosmeticId,
  Modifier,
  UpgradeId,
  Zone,
} from "./types";

export const ZONES: Zone[] = [
  { id: "entrance", name: "THE ENTRANCE", range: [1, 10], tagline: "Learn the rules. Survive the tower." },
  { id: "lab", name: "THE LAB", range: [11, 25], tagline: "Machines are watching." },
  { id: "factory", name: "THE FACTORY", range: [26, 40], tagline: "Steel. Motion. Pressure." },
  { id: "hotel", name: "THE HOTEL", range: [41, 55], tagline: "Some rooms were never meant to exist." },
  { id: "core", name: "THE CORE", range: [56, 70], tagline: "The tower starts fighting back." },
  { id: "abyss", name: "THE ABYSS", range: [71, 85], tagline: "Visibility is a luxury." },
  { id: "unknown", name: "THE UNKNOWN", range: [86, 99], tagline: "Rules are optional up here." },
  { id: "last", name: "THE LAST FLOOR", range: [100, 100], tagline: "You were expected." },
];

export const ROOM_INFO = {
  PUZZLE: { label: "PUZZLE", icon: "⌘", colorClass: "room-puzzle" },
  COMBAT: { label: "COMBAT", icon: "✦", colorClass: "room-combat" },
  ESCAPE: { label: "ESCAPE", icon: "↗", colorClass: "room-escape" },
  CHALLENGE: { label: "CHALLENGE", icon: "◎", colorClass: "room-challenge" },
  MEMORY: { label: "MEMORY", icon: "◈", colorClass: "room-memory" },
  UNKNOWN: { label: "UNKNOWN", icon: "?", colorClass: "room-unknown" },
} as const;

export const ABILITIES: Record<AbilityId, {
  id: AbilityId;
  name: string;
  description: string;
  cooldown: number;
  symbol: string;
}> = {
  DASH: { id: "DASH", name: "DASH", description: "A burst of speed and brief collision immunity.", cooldown: 5, symbol: "»" },
  SHIELD: { id: "SHIELD", name: "SHIELD", description: "Ignore the next hit for 3 seconds.", cooldown: 12, symbol: "◇" },
  TIME: { id: "TIME", name: "TIME", description: "Slow threats for 4 seconds.", cooldown: 15, symbol: "◷" },
  PULSE: { id: "PULSE", name: "PULSE", description: "Knock nearby enemies away and break streak pressure.", cooldown: 9, symbol: "◉" },
  SCAN: { id: "SCAN", name: "SCAN", description: "Reveal hidden hazards and bonus caches.", cooldown: 11, symbol: "⌁" },
};

export const DEFAULT_ABILITIES: AbilityId[] = ["DASH", "SHIELD"];

export const MODIFIERS: Modifier[] = [
  {
    id: "chaos",
    name: "CHAOS",
    description: "The tower gets meaner. The prize doubles.",
    effect: "Enemies +50%",
    scoreMultiplier: 1.2,
    rewardMultiplier: 2,
    speedMultiplier: 1,
    enemyMultiplier: 1.5,
  },
  {
    id: "slow",
    name: "SLOW",
    description: "Every movement is heavier. Every coin matters more.",
    effect: "Speed -20%",
    scoreMultiplier: 1.1,
    rewardMultiplier: 1.5,
    speedMultiplier: 0.8,
    enemyMultiplier: 1,
  },
  {
    id: "glass",
    name: "GLASS",
    description: "One mistake hurts. Clean rooms pay aggressively.",
    effect: "Damage ×2",
    scoreMultiplier: 1.35,
    rewardMultiplier: 1.75,
    speedMultiplier: 1,
    enemyMultiplier: 1,
  },
  {
    id: "overclock",
    name: "OVERCLOCK",
    description: "The tower accelerates. So do your rewards.",
    effect: "Time -25%",
    scoreMultiplier: 1.3,
    rewardMultiplier: 1.6,
    speedMultiplier: 1.12,
    enemyMultiplier: 1.15,
  },
];

export const UPGRADES: Record<UpgradeId, {
  id: UpgradeId;
  name: string;
  description: string;
  max: number;
  baseCost: number;
  step: number;
}> = {
  HEALTH: { id: "HEALTH", name: "HEALTH", description: "+1 maximum life", max: 5, baseCost: 160, step: 120 },
  SPEED: { id: "SPEED", name: "SPEED", description: "+5% movement speed", max: 8, baseCost: 220, step: 140 },
  SHIELD: { id: "SHIELD", name: "SHIELD", description: "+1 shield charge at run start", max: 4, baseCost: 300, step: 180 },
  LUCK: { id: "LUCK", name: "LUCK", description: "+8% chance for bonus loot", max: 8, baseCost: 260, step: 170 },
  ENERGY: { id: "ENERGY", name: "ENERGY", description: "-5% ability cooldowns", max: 8, baseCost: 280, step: 190 },
};

export const COSMETICS: Record<CosmeticId, {
  id: CosmeticId;
  name: string;
  description: string;
  cost: number;
  kind: "coins" | "shards";
  accent: string;
}> = {
  ROOKIE: { id: "ROOKIE", name: "ROOKIE", description: "The original suit.", cost: 0, kind: "coins", accent: "#dce8ef" },
  SHADOW: { id: "SHADOW", name: "SHADOW", description: "Built for the dark.", cost: 900, kind: "coins", accent: "#7d8793" },
  NEON: { id: "NEON", name: "NEON", description: "A clean pulse through the noise.", cost: 1800, kind: "coins", accent: "#7cf1d3" },
  GLITCH: { id: "GLITCH", name: "GLITCH", description: "Reality flickers around you.", cost: 4, kind: "shards", accent: "#b5a6ff" },
  GOLDEN: { id: "GOLDEN", name: "GOLDEN", description: "A very bad place to be subtle.", cost: 8, kind: "shards", accent: "#e3c77b" },
  VOID: { id: "VOID", name: "VOID", description: "Unlocked by reaching Floor 75.", cost: 0, kind: "coins", accent: "#4d5360" },
};

export const ACHIEVEMENTS = [
  { id: "first-step", name: "FIRST STEP", description: "Reach Floor 5.", target: 5, stat: "bestFloor" },
  { id: "survivor", name: "SURVIVOR", description: "Reach Floor 25.", target: 25, stat: "bestFloor" },
  { id: "deeper", name: "DEEPER", description: "Reach Floor 50.", target: 50, stat: "bestFloor" },
  { id: "insane", name: "INSANE", description: "Reach Floor 75.", target: 75, stat: "bestFloor" },
  { id: "the-end", name: "THE END?", description: "Reach Floor 100.", target: 100, stat: "bestFloor" },
  { id: "perfect", name: "PERFECT", description: "Complete 10 perfect floors.", target: 10, stat: "perfectFloors" },
  { id: "collector", name: "COLLECTOR", description: "Hold 10,000 coins at once.", target: 10000, stat: "coins" },
  { id: "combo", name: "OVERDRIVE", description: "Reach combo ×10.", target: 10, stat: "bestCombo" },
  { id: "boss", name: "NO ESCAPE", description: "Defeat 3 bosses.", target: 3, stat: "bossWins" },
  { id: "daily", name: "CLOCKWORK", description: "Clear 15 floors in a Daily Run.", target: 15, stat: "dailyBestFloor" },
  { id: "secret-door", name: "SECRET DOOR", description: "Find a key cache in The Unknown.", target: 1, stat: "secret" },
  { id: "architect", name: "THE ARCHITECT", description: "Defeat the final boss.", target: 1, stat: "finalBoss" },
] as const;

export const BOSS_NAMES: Record<number, string> = {
  25: "THE MACHINE",
  50: "THE GUARDIAN",
  75: "THE WATCHER",
  100: "THE ARCHITECT",
};

export function zoneForFloor(floor: number): Zone {
  return ZONES.find((zone) => floor >= zone.range[0] && floor <= zone.range[1]) ?? ZONES[0];
}

export function upgradeCost(id: UpgradeId, level: number): number {
  const config = UPGRADES[id];
  return config.baseCost + level * config.step;
}
