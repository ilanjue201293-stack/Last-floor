"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ABILITIES, ROOM_INFO } from "@/game/data";
import { mulberry32 } from "@/game/rng";
import { audio } from "@/game/audio";
import type { AbilityId, FloorConfig, RoomType } from "@/game/types";
import MobileControls from "./MobileControls";

type Point = { x: number; y: number };
type Enemy = Point & { id: number; kind: "hunter" | "tank" | "turret" | "boss" };

type Props = {
  floor: FloorConfig;
  lives: number;
  maxLives: number;
  score: number;
  combo: number;
  modifierMultiplier: number;
  speedMultiplier: number;
  abilityIds: AbilityId[];
  energyLevel: number;
  shieldLevel: number;
  sound: boolean;
  volume: number;
  onFloorClear: (result: { perfect: boolean; enemies: number; fast: number; puzzle?: boolean; boss?: boolean }) => void;
  onLoseLife: (reason?: string) => void;
  reducedMotion: boolean;
};

const ACCENT: Record<RoomType, string> = {
  PUZZLE: "#79e5cc",
  COMBAT: "#ff6262",
  ESCAPE: "#7ea8ff",
  CHALLENGE: "#e8cf71",
  MEMORY: "#b8a2ff",
  UNKNOWN: "#c5cbd0",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function makeSequence(seed: number, count: number) {
  const random = mulberry32(seed);
  const shapes = ["△", "□", "○", "◇", "✦", "◈"];
  return Array.from({ length: count }, () => shapes[Math.floor(random() * shapes.length)] ?? "△");
}

export default function GameView(props: Props) {
  const { floor, lives, maxLives, score, combo, modifierMultiplier, speedMultiplier, abilityIds, energyLevel, shieldLevel, sound, volume, onFloorClear, onLoseLife, reducedMotion } = props;
  const [player, setPlayer] = useState<Point>({ x: 50, y: 72 });
  const playerRef = useRef<Point>(player);
  const input = useRef<Point>({ x: 0, y: 0 });
  const [touchInput, setTouchInput] = useState<Point>({ x: 0, y: 0 });
  const [time, setTime] = useState(floor.timeLimit);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [shield, setShield] = useState(shieldLevel > 0);
  const [cooldowns, setCooldowns] = useState<Record<AbilityId, number>>(() => Object.fromEntries(abilityIds.map((id) => [id, 0])) as Record<AbilityId, number>);
  const [slow, setSlow] = useState(false);
  const [dash, setDash] = useState(false);
  const [scan, setScan] = useState(false);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [targets, setTargets] = useState<Point[]>([]);
  const [hits, setHits] = useState(0);
  const [memory, setMemory] = useState<string[]>([]);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleSequence, setPuzzleSequence] = useState<number[]>([0, 1, 2, 3]);
  const [bossHp, setBossHp] = useState(floor.isBoss ? 12 : 0);
  const [mysteryChoice, setMysteryChoice] = useState<number | null>(null);

  useEffect(() => { playerRef.current = player; }, [player]);

  const flash = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => current === text ? "" : current), 550);
  }, []);

  const hit = useCallback((reason: string) => {
    if (shield) {
      setShield(false);
      flash("SHIELD BROKEN");
      return;
    }
    onLoseLife(reason);
    setPlayer({ x: 50, y: 72 });
    playerRef.current = { x: 50, y: 72 };
  }, [flash, onLoseLife, shield]);

  const finish = useCallback((result: { perfect?: boolean; enemies?: number; puzzle?: boolean; boss?: boolean }) => {
    if (won) return;
    setWon(true);
    onFloorClear({ perfect: Boolean(result.perfect), enemies: result.enemies ?? 0, fast: Math.round(time), puzzle: result.puzzle, boss: result.boss });
  }, [onFloorClear, time, won]);

  useEffect(() => {
    const random = mulberry32(floor.seed);
    setTime(floor.timeLimit);
    setWon(false);
    setMessage("");
    setPlayer({ x: 50, y: 72 });
    playerRef.current = { x: 50, y: 72 };
    input.current = { x: 0, y: 0 };
    setTouchInput({ x: 0, y: 0 });
    setShield(shieldLevel > 0);
    setSlow(false);
    setDash(false);
    setScan(false);
    setCooldowns(Object.fromEntries(abilityIds.map((id) => [id, 0])) as Record<AbilityId, number>);
    setHits(0);
    setPuzzleIndex(0);
    const puzzleRandom = mulberry32(floor.seed ^ 0x51a7);
    const puzzleLength = 4 + (floor.variant % 3);
    setPuzzleSequence(Array.from({ length: puzzleLength }, () => Math.floor(puzzleRandom() * 4)));
    setBossHp(floor.isBoss ? 12 : 0);
    setMysteryChoice(null);
    setMemory(makeSequence(floor.seed, Math.min(8, 3 + Math.floor(floor.difficulty / 2))));
    setMemoryIndex(0);
    setMemoryVisible(floor.type === "MEMORY");
    setTargets(floor.type === "CHALLENGE" ? Array.from({ length: 6 }, () => ({ x: 12 + random() * 76, y: 12 + random() * 74 })) : []);
    setEnemies(floor.type === "COMBAT" ? (floor.isBoss ? [{ id: 0, x: 50, y: 30, kind: "boss" as const }] : Array.from({ length: Math.min(8, 2 + floor.difficulty) }, (_, id) => ({
      id, x: 14 + random() * 72, y: 16 + random() * 56, kind: id % 4 === 0 ? "tank" as const : id % 3 === 0 ? "turret" as const : "hunter" as const,
    }))) : []);
  }, [abilityIds, floor, shieldLevel]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") input.current.y = -1;
      if (key === "s" || key === "arrowdown") input.current.y = 1;
      if (key === "a" || key === "arrowleft") input.current.x = -1;
      if (key === "d" || key === "arrowright") input.current.x = 1;
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) event.preventDefault();
      if (key === " " || key === "e") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("last-floor-action"));
      }
    };
    const onUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "s" || key === "arrowup" || key === "arrowdown") input.current.y = 0;
      if (key === "a" || key === "d" || key === "arrowleft" || key === "arrowright") input.current.x = 0;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (won) return;
      setTime((current) => {
        const next = Math.max(0, current - 0.1);
        if (next <= 0.05) {
          onLoseLife("TIMEOUT");
          return floor.timeLimit;
        }
        return next;
      });
      setCooldowns((current) => {
        const next = { ...current };
        (Object.keys(next) as AbilityId[]).forEach((id) => { next[id] = Math.max(0, next[id] - 0.1); });
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [floor.timeLimit, onLoseLife, won]);

  useEffect(() => {
    if (!memory.length || floor.type !== "MEMORY") return;
    const timer = window.setTimeout(() => setMemoryVisible(false), reducedMotion ? 900 : 1700);
    return () => window.clearTimeout(timer);
  }, [floor.type, memory.length, reducedMotion]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!won) {
        const source = Math.hypot(input.current.x, input.current.y) > 0 ? input.current : touchInput;
        if (source.x || source.y) {
          const movement = 18 * speedMultiplier * (dash ? 2.5 : 1) * (slow ? 0.5 : 1);
          setPlayer((current) => {
            const next = { x: clamp(current.x + source.x * movement * dt, 5, 95), y: clamp(current.y + source.y * movement * dt, 8, 90) };
            playerRef.current = next;
            return next;
          });
        }
        if (floor.type === "COMBAT") {
          const currentPlayer = playerRef.current;
          setEnemies((current) => current.map((enemy) => {
            if (enemy.kind === "turret") return enemy;
            const dx = currentPlayer.x - enemy.x;
            const dy = currentPlayer.y - enemy.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            const enemySpeed = enemy.kind === "boss" ? 1.7 : enemy.kind === "tank" ? 2.4 : 4.8;
            return { ...enemy, x: clamp(enemy.x + dx / len * enemySpeed * dt, 7, 93), y: clamp(enemy.y + dy / len * enemySpeed * dt, 10, 88) };
          }));
          if (enemies.some((enemy) => dist(enemy, currentPlayer) < 5.5)) hit("CONTACT");
        }
        if (floor.type === "ESCAPE" && Math.random() < dt * 0.13) hit("LASER");
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dash, enemies, floor.type, hit, slow, speedMultiplier, touchInput, won]);

  const action = useCallback(() => {
    if (won) return;
    if (floor.type === "ESCAPE") {
      if (player.x > 82 && player.y < 29) finish({ perfect: lives === maxLives });
      else flash("EXIT // MOVE UP");
      return;
    }
    if (floor.type === "CHALLENGE") {
      const index = targets.findIndex((target) => dist(target, player) < 12);
      if (index < 0) return flash("MISS");
      const next = targets.filter((_, i) => i !== index);
      setTargets(next);
      const count = hits + 1;
      setHits(count);
      flash("TARGET DOWN");
      if (count >= 6) finish({ perfect: lives === maxLives });
      return;
    }
    if (floor.type === "PUZZLE") {
      return;
    }
    if (floor.type === "UNKNOWN") {
      flash("PICK A DOOR");
      return;
    }
    if (floor.type === "COMBAT") {
      const target = enemies.filter((enemy) => dist(enemy, player) < 18).sort((a,b) => dist(a,player)-dist(b,player))[0];
      if (!target) return flash("OUT OF RANGE");
      if (floor.isBoss) {
        const next = bossHp - 1;
        setBossHp(next);
        if (next <= 0) finish({ boss: true, enemies: 8, perfect: lives === maxLives });
        else if ([9,6,3].includes(next)) flash("PHASE SHIFT");
      } else {
        const count = enemies.filter((enemy) => enemy.id !== target.id).length;
        setEnemies((current) => current.filter((enemy) => enemy.id !== target.id));
        flash("TARGET DOWN");
        if (count <= 0) finish({ enemies: 1, perfect: lives === maxLives });
      }
    }
  }, [bossHp, enemies, finish, flash, floor.isBoss, floor.type, hits, lives, maxLives, player, targets, won]);

  useEffect(() => {
    const listener = () => action();
    window.addEventListener("last-floor-action", listener);
    return () => window.removeEventListener("last-floor-action", listener);
  }, [action]);

  const useAbility = (id: AbilityId) => {
    if (won || cooldowns[id] > 0) return;
    const cooldown = ABILITIES[id].cooldown * Math.max(0.65, 1 - energyLevel * 0.05);
    audio.play(id === "DASH" ? "dash" : id === "SHIELD" ? "checkpoint" : id === "TIME" ? "danger" : id === "PULSE" ? "combo" : "click", sound, volume);
    setCooldowns((current) => ({ ...current, [id]: cooldown }));
    if (id === "DASH") { setDash(true); flash("DASH"); window.setTimeout(() => setDash(false), 520); }
    if (id === "SHIELD") { setShield(true); flash("SHIELD ONLINE"); window.setTimeout(() => setShield(false), 3000); }
    if (id === "TIME") { setSlow(true); flash("TIME SLOWED"); window.setTimeout(() => setSlow(false), 4000); }
    if (id === "PULSE") { setEnemies((current) => current.filter((enemy) => dist(enemy, player) > 22)); flash("PULSE"); }
    if (id === "SCAN") { setScan(true); flash("SCAN"); window.setTimeout(() => setScan(false), 5000); }
  };

  const accent = ACCENT[floor.type];
  const ratio = time / floor.timeLimit;

  return <section className="game-screen" style={{ "--room-accent": accent } as CSSProperties}>
    <header className="hud">
      <div className="hud-left"><div className="floor-chip"><span>FLOOR</span><strong>{String(floor.floor).padStart(2,"0")}</strong></div><div className="zone-chip">{floor.zone.name}</div></div>
      <div className="hud-center"><div className="room-kicker"><span>{ROOM_INFO[floor.type].icon}</span> {ROOM_INFO[floor.type].label}</div><div className="room-title">{floor.title}</div><div className="objective">{floor.objective}</div></div>
      <div className="hud-right"><div className="hud-stat"><span>SCORE</span><strong>{score.toLocaleString("fr-FR")}</strong></div><div className="hud-stat"><span>COMBO</span><strong className="combo-text">×{combo}</strong></div><div className="lives">{Array.from({length:maxLives},(_,i)=><span key={i} className={i < lives ? "life alive" : "life"}>♥</span>)}</div></div>
    </header>
    <main className="game-main">
      <div className="arena-shell">
        <div className={(scan ? "arena-frame scan-active" : "arena-frame") + " zone-" + floor.zone.id + " variant-" + floor.variant}>
          <div className="arena-grid" /><div className="arena-scanline" />
          <div className="room-decor" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="room-label"><b>{floor.variantName}</b>{floor.zone.name}<span>// SECTOR {String(floor.floor).padStart(3,"0")}</span></div>
          {floor.type === "COMBAT" && <><div className="combat-ring" />{enemies.map((enemy)=><div key={enemy.id} className={"enemy "+enemy.kind} style={{left:enemy.x+"%",top:enemy.y+"%"}}><span /></div>)}</>}
          {floor.type === "ESCAPE" && <><div className="laser laser-a" /><div className="laser laser-b" /><div className="laser laser-c" /><div className="escape-exit"><span>EXIT</span><b>↗</b></div></>}
          {floor.type === "CHALLENGE" && targets.map((target,index)=><button className="target" key={index} style={{left:target.x+"%",top:target.y+"%"}} onClick={()=>{setPlayer(target);playerRef.current=target;action();}}><span>{String(index+1).padStart(2,"0")}</span></button>)}
          {floor.type === "PUZZLE" && <div className="puzzle-console"><div className="puzzle-screen"><span>SIGNAL LOCK</span><strong>{puzzleIndex}/{puzzleSequence.length}</strong><small>PRESS IN SEQUENCE</small></div><div className="puzzle-buttons">{[0,1,2,3].map((value)=><button key={value} className={puzzleIndex>value?"pressed":""} onClick={()=>{if(value!==puzzleSequence[puzzleIndex]){flash("WRONG CIRCUIT");onLoseLife("PUZZLE");setPuzzleIndex(0);return;}const next=value+1;setPuzzleIndex(next);if(next>=puzzleSequence.length)finish({perfect:lives===maxLives,puzzle:true});}}>{["Ⅰ","Ⅱ","Ⅲ","Ⅳ"][value]}</button>)}</div></div>}
          {floor.type === "UNKNOWN" && <div className="unknown-console"><span className="unknown-question">?</span><strong>CHOOSE ONE</strong><small>The tower will remember.</small><div className="unknown-doors">{[0,1,2].map((door) => <button key={door} className={mysteryChoice === door ? "chosen" : ""} onClick={() => { const safe = floor.seed % 3; const bonus = Math.floor(floor.seed / 7) % 3; setMysteryChoice(door); if (door === safe || door === bonus) finish({ perfect: lives === maxLives }); else { flash("THE WRONG DOOR"); onLoseLife("TRAP"); window.setTimeout(() => setMysteryChoice(null), 420); } }}><span>DOOR {door + 1}</span><b>↗</b></button>)}</div></div>}
          {floor.type === "MEMORY" && <div className="memory-console"><div className={memoryVisible?"memory-sequence visible":"memory-sequence"}>{memory.map((symbol,index)=><span key={index}>{symbol}</span>)}</div><div className="memory-buttons">{["△","□","○","◇","✦","◈"].map((symbol)=><button key={symbol} disabled={memoryVisible} onClick={()=>{if(symbol!==memory[memoryIndex]){flash("SIGNAL LOST");onLoseLife("MEMORY");setMemoryIndex(0);return;}const next=memoryIndex+1;setMemoryIndex(next);if(next>=memory.length)finish({perfect:lives===maxLives,puzzle:true});}}>{symbol}</button>)}</div></div>}
          <div className={shield ? "player shielded" : "player"} style={{left:player.x+"%",top:player.y+"%"}}><i /><span /></div>
          {message && <div className="arena-flash">{message}</div>}
          {floor.isBoss && <div className="boss-hud"><div className="boss-name">{floor.bossName}</div><div className="boss-bar"><span style={{width:(bossHp/12*100)+"%"}} /></div><small>PHASE {Math.max(1,Math.min(4,4-Math.floor(bossHp/3)))}</small></div>}
          <div className="timer-block"><span>TIME</span><strong className={ratio<0.2?"urgent":""}>{time.toFixed(1)}</strong><div className="timer-line"><i style={{width:(ratio*100)+"%"}} /></div></div>
          {won && <div className="clear-overlay"><span>FLOOR CLEAR</span><small>ASCENDING…</small></div>}
        </div>
        <div className="arena-footer"><div className="control-hint"><span className="key">WASD</span><span>MOVE</span><span className="key">SPACE</span><span>ACTION</span></div><div className="reward-preview"><span>REWARD</span><b>+{Math.round(floor.reward.coins*modifierMultiplier)} ◉</b>{floor.reward.shards>0&&<b>+{floor.reward.shards} ◆</b>}{floor.reward.keys>0&&<b>+{floor.reward.keys} KEY</b>}</div></div>
      </div>
      <aside className="game-side"><div className="side-card"><div className="side-card-title"><span>ABILITIES</span><small>LOADOUT</small></div><div className="ability-list">{abilityIds.map((id)=><button key={id} className="ability-button" onClick={()=>useAbility(id)} disabled={cooldowns[id]>0}><span className="ability-symbol">{ABILITIES[id].symbol}</span><span><strong>{id}</strong><small>{ABILITIES[id].description}</small></span><em>{cooldowns[id]>0?cooldowns[id].toFixed(1):"READY"}</em></button>)}</div></div><div className="side-card side-mini"><div className="side-card-title"><span>FLOOR INTEL</span></div><div className="intel-grid"><div><span>DIFFICULTY</span><b>{"▮".repeat(floor.difficulty)}{"▯".repeat(10-floor.difficulty)}</b></div><div><span>ZONE</span><b>{floor.zone.name}</b></div><div><span>SEED</span><b>{floor.seed.toString(16).slice(0,8).toUpperCase()}</b></div></div></div><div className="side-card side-tip"><span className="tip-mark">!</span><p>{sound?"Audio feedback ready.":"Audio muted."} Tap an ability when the tower closes in.</p></div></aside>
    </main>
    <MobileControls direction={touchInput} onDirection={(x,y)=>setTouchInput({x,y})} onAction={action} onAbility={useAbility} abilities={abilityIds} cooldowns={cooldowns} />
  </section>;
}
