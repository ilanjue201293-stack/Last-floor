import { BOSS_NAMES, ROOM_INFO, zoneForFloor } from "./data";
import { hashSeed, mulberry32, seededPick } from "./rng";
import type { FloorConfig, RoomType } from "./types";

const EARLY_ROOMS: RoomType[] = ["PUZZLE", "MEMORY", "CHALLENGE", "ESCAPE", "COMBAT"];
const LATE_ROOMS: RoomType[] = ["COMBAT", "ESCAPE", "CHALLENGE", "PUZZLE", "MEMORY", "COMBAT", "UNKNOWN"];
const VARIANTS: Record<RoomType, string[]> = {
  PUZZLE: ["SIGNAL VAULT", "LASER ARRAY", "SWITCH GRID", "COLOR CORE", "LOCKED TERMINAL", "SHIFTING PANELS"],
  COMBAT: ["ARENA", "SECURITY DECK", "HUNTER PIT", "REACTOR BAY", "DRONE YARD", "CONTAINMENT"],
  ESCAPE: ["LASER HALL", "COLLAPSING DECK", "REDLINE CORRIDOR", "VERTICAL SHAFT", "LOCKDOWN", "FALLING GRID"],
  CHALLENGE: ["TARGET RANGE", "REACTION LAB", "MOVING GALLERY", "CLOCKWORK", "PRECISION DECK", "SWARM TEST"],
  MEMORY: ["ECHO CHAMBER", "SIGNAL MIRROR", "SYNAPSE ROOM", "DARK ARRAY", "ARCHIVE", "RECALL TEST"],
  UNKNOWN: ["SEALED ROOM", "FALSE FLOOR", "BLACK BOX", "UNMARKED", "NULL SPACE", "THE QUIET ROOM"],
};


export function generateFloor(floor: number, runSeed: number, daily = false): FloorConfig {
  const seed = hashSeed(`${runSeed}:${floor}:${daily ? "D" : "R"}`);
  const random = mulberry32(seed);
  const zone = zoneForFloor(floor);
  const isBoss = Boolean(BOSS_NAMES[floor]);
  const room = isBoss
    ? "COMBAT"
    : zone.id === "unknown"
      ? seededPick(LATE_ROOMS, random)
      : seededPick(floor <= 10 ? EARLY_ROOMS : LATE_ROOMS, random);
  const difficulty = Math.min(10, 1 + Math.floor((floor - 1) / 10));
  const variants = VARIANTS[room];
  const variant = Math.floor(random() * variants.length);
  const typeLabel = ROOM_INFO[room].label;
  const baseTime = Math.max(8, 27 - difficulty * 1.6);

  const reward = {
    coins: Math.round(38 + floor * 7 + difficulty * 15 + random() * 30),
    shards: floor % 7 === 0 ? 1 + (random() > 0.75 ? 1 : 0) : 0,
    keys: floor % 11 === 0 && random() > 0.3 ? 1 : 0,
  };

  return {
    floor,
    zone,
    type: room,
    title: isBoss ? BOSS_NAMES[floor]! : `${typeLabel} // ${zone.name}`,
    objective: isBoss
      ? `Defeat ${BOSS_NAMES[floor]}.`
      : room === "COMBAT"
        ? "Survive the arena and keep your combo alive."
        : room === "ESCAPE"
          ? "Reach the exit before the room locks."
          : room === "PUZZLE"
            ? "Read the system. Solve the sequence. Open the door."
            : room === "MEMORY"
              ? "Remember the pattern. One mistake costs a life."
              : "Complete the objective before the timer expires.",
    difficulty,
    timeLimit: baseTime,
    reward,
    seed,
    isBoss,
    bossName: BOSS_NAMES[floor],
    variant,
    variantName: variants[variant] ?? ROOM_INFO[room].label,
  };
}
