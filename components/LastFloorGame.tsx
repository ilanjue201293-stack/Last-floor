"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ABILITIES, ACHIEVEMENTS, DEFAULT_ABILITIES, MODIFIERS, UPGRADES, COSMETICS, upgradeCost } from "@/game/data";
import { audio } from "@/game/audio";
import { dateSeed, hashSeed } from "@/game/rng";
import { DEFAULT_SAVE, loadSave, resetSave, saveGame } from "@/game/save";
import { generateFloor } from "@/game/floor-generator";
import type { AbilityId, CosmeticId, Modifier, RunSnapshot, SaveData, UpgradeId } from "@/game/types";
import GameView from "./GameView";
import { AchievementsScreen, GameOverScreen, MenuScreen, ModifierScreen, OptionsScreen, ProfileScreen, ShopScreen, TowerScreen } from "./screens";

type Screen = "menu" | "run" | "tower" | "profile" | "shop" | "achievements" | "options" | "modifier" | "gameover";

const pathScreen = (path: string): Screen => {
  if (path.startsWith("/tower")) return "tower";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/shop")) return "shop";
  if (path.startsWith("/achievements")) return "achievements";
  if (path.startsWith("/options")) return "options";
  return "menu";
};

const makeRun = (daily: boolean): RunSnapshot => ({
  seed: daily ? dateSeed() : hashSeed("RUN:" + Date.now() + ":" + Math.random()),
  daily, floor: 1, checkpoint: 0, lives: 3, score: 0,
  runCoins: 0, runShards: 0, runKeys: 0, combo: 0, bestCombo: 0,
  damageTaken: 0, perfectStreak: 0, floorsCleared: 0, modifier: null,
  checkpointUsed: false, startedAt: Date.now(),
});

const today = () => new Date().toISOString().slice(0, 10);

export default function LastFloorGame() {
  const pathname = usePathname();
  const router = useRouter();
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [run, setRun] = useState<RunSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>(pathScreen(pathname));
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(false);
  const [toast, setToast] = useState("");
  const [abilities, setAbilities] = useState<AbilityId[]>(DEFAULT_ABILITIES);

  const maxLives = 3 + save.upgrades.HEALTH;
  const floor = run ? generateFloor(run.floor, run.seed, run.daily) : null;
  const rewardMultiplier = run?.modifier?.rewardMultiplier ?? 1;
  const speedMultiplier = (1 + save.upgrades.SPEED * 0.05) * (run?.modifier?.speedMultiplier ?? 1);

  useEffect(() => {
    const loaded = loadSave();
    setSave(loaded);
    setRun(loaded.activeRun);
    setReady(true);
    if (!loaded.activeRun && loaded.stats.totalRuns === 0 && !localStorage.getItem("last-floor-intro")) setIntro(true);
  }, []);

  useEffect(() => {
    const next = pathScreen(pathname);
    if (!["/"].includes(pathname)) setScreen(next);
  }, [pathname]);

  const persist = useCallback((next: SaveData) => {
    setSave(next);
    saveGame(next);
  }, []);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((current) => current === text ? "" : current), 2200);
  }, []);

  const navigate = useCallback((target: Screen) => {
    setScreen(target);
    router.push(target === "menu" ? "/" : "/" + target);
  }, [router]);

  const startRun = useCallback((daily: boolean) => {
    const next = makeRun(daily);
    setRun(next);
    persist({ ...save, activeRun: next });
    setScreen("run");
    router.push("/");
    audio.play(daily ? "checkpoint" : "door", save.settings.sound, save.settings.volume);
  }, [persist, router, save]);

  const continueRun = useCallback(() => {
    if (!run) return;
    setScreen("run");
    router.push("/");
  }, [router, run]);

  const bankRun = useCallback((dead: RunSnapshot, extraDeath: boolean) => {
    const coinBank = Math.floor(dead.runCoins * (dead.checkpoint > 0 ? 0.72 : 0.55));
    const shardBank = Math.floor(dead.runShards * 0.7);
    const keyBank = Math.floor(dead.runKeys * 0.65);
    const climbed = dead.floorsCleared;
    const reached = Math.max(0, dead.floor - 1);
    const nextStats = {
      ...save.stats,
      totalRuns: save.stats.totalRuns + 1,
      totalFloors: save.stats.totalFloors + climbed,
      bestFloor: Math.max(save.stats.bestFloor, reached),
      bestScore: Math.max(save.stats.bestScore, dead.score),
      previousScore: dead.score,
      coinsEarned: save.stats.coinsEarned + coinBank,
      deaths: save.stats.deaths + (extraDeath ? 1 : 0),
      bestCombo: Math.max(save.stats.bestCombo, dead.bestCombo),
      dailyBestFloor: dead.daily ? Math.max(save.stats.dailyBestFloor, reached) : save.stats.dailyBestFloor,
      dailyBestScore: dead.daily ? Math.max(save.stats.dailyBestScore, dead.score) : save.stats.dailyBestScore,
      dailyDate: dead.daily ? today() : save.stats.dailyDate,
    };
    persist({ ...save, coins: save.coins + coinBank, shards: save.shards + shardBank, keys: save.keys + keyBank, stats: nextStats, activeRun: null });
    setRun(null);
  }, [persist, save]);

  const loseLife = useCallback((reason = "DAMAGE") => {
    if (!run) return;
    const nextLives = run.lives - 1;
    const next = { ...run, lives: nextLives, combo: 0, damageTaken: run.damageTaken + 1, perfectStreak: 0, score: Math.max(0, run.score - 160) };
    setRun(next);
    persist({ ...save, activeRun: next });
    audio.play("hit", save.settings.sound, save.settings.volume);
    if (nextLives > 0) {
      notify("-" + reason + " // " + nextLives + " LIFE LEFT");
      return;
    }
    bankRun(next, true);
    setScreen("gameover");
    audio.play("gameover", save.settings.sound, save.settings.volume);
  }, [bankRun, notify, persist, run, save]);

  const finishFloor = useCallback((result: { perfect: boolean; enemies: number; fast: number; puzzle?: boolean; boss?: boolean }) => {
    if (!run || !floor) return;
    const combo = Math.min(10, run.combo + 1);
    const luckRoll = Math.random();
    const lucky = luckRoll < save.upgrades.LUCK * 0.08;
    const bonus = lucky ? Math.round(20 + run.floor * 1.6) : 0;
    const coinReward = Math.round((floor.reward.coins + bonus) * rewardMultiplier);
    const scoreReward = Math.round((900 + run.floor * 110 + result.fast * 24 + combo * 100) * (run.modifier?.scoreMultiplier ?? 1));
    const clearedFloor = run.floor;
    const nextFloor = clearedFloor + 1;
    const checkpoint = clearedFloor % 10 === 0 ? clearedFloor : run.checkpoint;
    const next = {
      ...run,
      floor: Math.min(100, nextFloor),
      checkpoint,
      lives: Math.min(maxLives, run.lives + (clearedFloor % 10 === 0 ? 1 : 0)),
      score: run.score + scoreReward,
      runCoins: run.runCoins + coinReward,
      runShards: run.runShards + floor.reward.shards,
      runKeys: run.runKeys + floor.reward.keys,
      combo,
      bestCombo: Math.max(run.bestCombo, combo),
      perfectStreak: result.perfect ? run.perfectStreak + 1 : 0,
      floorsCleared: run.floorsCleared + 1,
    } satisfies RunSnapshot;

    const nextStats: SaveData["stats"] = {
      ...save.stats,
      bestFloor: Math.max(save.stats.bestFloor, clearedFloor),
      bestScore: Math.max(save.stats.bestScore, next.score),
      totalFloors: save.stats.totalFloors + 1,
      perfectFloors: save.stats.perfectFloors + (result.perfect ? 1 : 0),
      puzzlesSolved: save.stats.puzzlesSolved + (result.puzzle ? 1 : 0),
      enemiesDefeated: save.stats.enemiesDefeated + result.enemies,
      bestCombo: Math.max(save.stats.bestCombo, next.bestCombo),
      fastestFloor: Math.min(save.stats.fastestFloor, Math.max(1, result.fast)),
      bossWins: save.stats.bossWins + (result.boss ? 1 : 0),
      dailyBestFloor: next.daily ? Math.max(save.stats.dailyBestFloor, clearedFloor) : save.stats.dailyBestFloor,
      dailyBestScore: next.daily ? Math.max(save.stats.dailyBestScore, next.score) : save.stats.dailyBestScore,
      dailyDate: next.daily ? today() : save.stats.dailyDate,
    };

    if (clearedFloor >= 100) {
      const victoryRun = { ...next, floor: 100 };
      setRun(victoryRun);
      persist({ ...save, stats: nextStats, activeRun: null, coins: save.coins + victoryRun.runCoins, shards: save.shards + victoryRun.runShards, keys: save.keys + victoryRun.runKeys });
      setScreen("gameover");
      notify("THE LAST FLOOR // ASCENSION COMPLETE");
      audio.play("victory", save.settings.sound, save.settings.volume);
      return;
    }

    setRun(next);
    persist({ ...save, stats: nextStats, activeRun: next });
    notify(clearedFloor % 10 === 0 ? "CHECKPOINT // FLOOR " + clearedFloor : "+" + coinReward + " COINS // FLOOR CLEAR");
    audio.play(clearedFloor % 10 === 0 ? "checkpoint" : "reward", save.settings.sound, save.settings.volume);
    setScreen(clearedFloor % 5 === 0 ? "modifier" : "run");
  }, [floor, maxLives, notify, persist, rewardMultiplier, run, save]);

  const chooseModifier = useCallback((modifier: Modifier) => {
    if (!run) return;
    const next = { ...run, modifier };
    setRun(next);
    persist({ ...save, activeRun: next });
    setScreen("run");
    audio.play("checkpoint", save.settings.sound, save.settings.volume);
  }, [persist, run, save]);

  const restoreCheckpoint = useCallback(() => {
    if (!run || run.checkpoint <= 0) return;
    const next = { ...run, floor: Math.min(100, run.checkpoint + 1), lives: Math.min(maxLives, 2 + save.upgrades.HEALTH), score: Math.floor(run.score * 0.72), combo: 0, checkpointUsed: true };
    setRun(next);
    persist({ ...save, activeRun: next });
    setScreen("run");
    notify("CHECKPOINT RESTORED // FLOOR " + next.floor);
  }, [maxLives, notify, persist, run, save]);

  const buyUpgrade = useCallback((id: UpgradeId) => {
    const level = save.upgrades[id];
    const item = UPGRADES[id];
    const cost = upgradeCost(id, level);
    if (level >= item.max) return notify("UPGRADE // MAX LEVEL");
    if (save.coins < cost) return notify("INSUFFICIENT COINS");
    persist({ ...save, coins: save.coins - cost, upgrades: { ...save.upgrades, [id]: level + 1 } });
    audio.play("reward", save.settings.sound, save.settings.volume);
    notify(item.name + " // LEVEL " + (level + 1));
  }, [notify, persist, save]);

  const buyCosmetic = useCallback((id: CosmeticId) => {
    const item = COSMETICS[id];
    if (id === "VOID" && save.stats.bestFloor < 75) return notify("LOCKED // REACH FLOOR 75");
    if (save.ownedCosmetics.includes(id)) {
      persist({ ...save, selectedCosmetic: id });
      notify(item.name + " // EQUIPPED");
      return;
    }
    if (item.kind === "coins" && save.coins >= item.cost) {
      persist({ ...save, coins: save.coins - item.cost, ownedCosmetics: [...save.ownedCosmetics, id], selectedCosmetic: id });
      audio.play("reward", save.settings.sound, save.settings.volume);
      return;
    }
    if (item.kind === "shards" && save.shards >= item.cost) {
      persist({ ...save, shards: save.shards - item.cost, ownedCosmetics: [...save.ownedCosmetics, id], selectedCosmetic: id });
      audio.play("reward", save.settings.sound, save.settings.volume);
      return;
    }
    notify("INSUFFICIENT RESOURCES");
  }, [notify, persist, save]);

  useEffect(() => {
    if (!ready) return;
    const unlocks = ACHIEVEMENTS.filter((achievement) => {
      const value = achievement.stat === "coins" ? save.coins : achievement.stat === "secret" ? (save.stats.bestFloor >= 86 ? 1 : 0) : achievement.stat === "finalBoss" ? (save.stats.bestFloor >= 100 ? 1 : 0) : Number(save.stats[achievement.stat as keyof SaveData["stats"]]);
      return value >= achievement.target && !save.achievements.includes(achievement.id);
    }).map((achievement) => achievement.id);
    if (unlocks.length) {
      const next = { ...save, achievements: [...new Set(save.achievements.concat(unlocks))] };
      persist(next);
      notify("ACHIEVEMENT // " + unlocks.length + " NEW");
    }
  }, [notify, persist, ready, save]);

  const endIntro = () => {
    localStorage.setItem("last-floor-intro", "1");
    setIntro(false);
  };

  const menuStats = useMemo(() => [
    ["BEST FLOOR", String(save.stats.bestFloor).padStart(2, "0")],
    ["BEST SCORE", save.stats.bestScore.toLocaleString("fr-FR")],
    ["RUNS", String(save.stats.totalRuns)],
  ], [save]);

  if (!ready) return <div className="boot-screen"><div className="boot-logo">LAST<br />FLOOR</div><span>INITIALIZING TOWER…</span></div>;

  if (intro) return <main className="intro-screen"><div className="intro-lines"><span>YEAR 20XX</span><span>Nobody knows who built it.</span><span>Nobody knows what is at the top.</span><span>There are 100 floors.</span><strong>You are going up.</strong></div><button className="big-action primary" onClick={endIntro}>ENTER THE TOWER <b>↗</b></button></main>;

  if (screen === "run" && run && floor) return <div className="game-root"><GameView floor={floor} lives={run.lives} maxLives={maxLives} score={run.score} combo={run.combo} modifierMultiplier={rewardMultiplier} speedMultiplier={speedMultiplier} abilityIds={abilities} energyLevel={save.upgrades.ENERGY} shieldLevel={save.upgrades.SHIELD} sound={save.settings.sound} volume={save.settings.volume} onFloorClear={finishFloor} onLoseLife={loseLife} reducedMotion={save.settings.reducedMotion} /></div>;

  if (screen === "modifier" && run) return <div className="app-shell"><ModifierScreen onChoose={chooseModifier} /></div>;

  if (screen === "gameover" && run) return <div className="app-shell"><GameOverScreen run={run} victory={run.floor >= 100 && run.floorsCleared >= 99} onRetry={() => startRun(run.daily)} onCheckpoint={run.checkpoint > 0 && !run.checkpointUsed ? restoreCheckpoint : undefined} onMenu={() => { setRun(null); persist({ ...save, activeRun: null }); navigate("menu"); }} /></div>;

  return <div className="app-shell">
    <nav className="top-nav"><button className="brand-mark" onClick={() => navigate("menu")}><span>LF</span><b>LAST FLOOR</b></button><div className="resource-bar"><span>◉ {save.coins.toLocaleString("fr-FR")}</span><span>◆ {save.shards}</span><span>⌑ {save.keys}</span></div><div className="nav-actions"><button onClick={() => navigate("tower")}>TOWER</button><button onClick={() => navigate("profile")}>PROFILE</button><button onClick={() => navigate("shop")}>ARMORY</button></div></nav>
    {screen === "menu" && <MenuScreen save={save} run={run} abilities={abilities} setAbilities={setAbilities} onContinue={continueRun} onNew={() => startRun(false)} onDaily={() => startRun(true)} onNavigate={(target) => navigate(target as Screen)} />}
    {screen === "tower" && <TowerScreen save={save} run={run} onRun={() => run ? continueRun() : startRun(false)} />}
    {screen === "profile" && <ProfileScreen save={save} onMenu={() => navigate("menu")} />}
    {screen === "shop" && <ShopScreen save={save} onUpgrade={buyUpgrade} onCosmetic={buyCosmetic} onMenu={() => navigate("menu")} />}
    {screen === "achievements" && <AchievementsScreen save={save} onMenu={() => navigate("menu")} />}
    {screen === "options" && <OptionsScreen save={save} setSave={setSave} onReset={() => { const fresh = resetSave(); setSave(fresh); setRun(null); notify("SAVE RESET"); }} onMenu={() => navigate("menu")} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
