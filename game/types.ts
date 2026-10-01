export type RoomType = "PUZZLE" | "COMBAT" | "ESCAPE" | "CHALLENGE" | "MEMORY" | "UNKNOWN";
export type AbilityId = "DASH" | "SHIELD" | "TIME" | "PULSE" | "SCAN";
export type CosmeticId = "ROOKIE" | "SHADOW" | "NEON" | "GLITCH" | "GOLDEN" | "VOID";

export type Zone = {
  id: string;
  name: string;
  range: [number, number];
  tagline: string;
};

export type Modifier = {
  id: string;
  name: string;
  description: string;
  effect: string;
  scoreMultiplier: number;
  rewardMultiplier: number;
  speedMultiplier: number;
  enemyMultiplier: number;
};

export type FloorConfig = {
  floor: number;
  zone: Zone;
  type: RoomType;
  title: string;
  objective: string;
  difficulty: number;
  timeLimit: number;
  reward: { coins: number; shards: number; keys: number };
  seed: number;
  isBoss: boolean;
  bossName?: string;
  variant: number;
  variantName: string;
};

export type UpgradeId = "HEALTH" | "SPEED" | "SHIELD" | "LUCK" | "ENERGY";

export type UpgradeState = Record<UpgradeId, number>;

export type ProfileStats = {
  totalRuns: number;
  totalFloors: number;
  bestFloor: number;
  bestScore: number;
  previousScore: number;
  coinsEarned: number;
  puzzlesSolved: number;
  enemiesDefeated: number;
  deaths: number;
  perfectFloors: number;
  fastestFloor: number;
  bestCombo: number;
  bossWins: number;
  dailyBestFloor: number;
  dailyBestScore: number;
  dailyDate: string;
};

export type SaveData = {
  version: 1;
  coins: number;
  shards: number;
  keys: number;
  upgrades: UpgradeState;
  ownedCosmetics: CosmeticId[];
  selectedCosmetic: CosmeticId;
  achievements: string[];
  stats: ProfileStats;
  settings: {
    sound: boolean;
    volume: number;
    reducedMotion: boolean;
  };
  activeRun: RunSnapshot | null;
};

export type RunSnapshot = {
  seed: number;
  daily: boolean;
  floor: number;
  checkpoint: number;
  lives: number;
  score: number;
  runCoins: number;
  runShards: number;
  runKeys: number;
  combo: number;
  bestCombo: number;
  damageTaken: number;
  perfectStreak: number;
  floorsCleared: number;
  modifier: Modifier | null;
  checkpointUsed: boolean;
  startedAt: number;
};

export type RunResult = {
  score: number;
  floor: number;
  floorsCleared: number;
  runCoins: number;
  runShards: number;
  runKeys: number;
  damageTaken: number;
  bestCombo: number;
  daily: boolean;
};
