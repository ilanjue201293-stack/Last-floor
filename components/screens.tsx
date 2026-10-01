"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { ABILITIES, ACHIEVEMENTS, COSMETICS, MODIFIERS, UPGRADES, ZONES, upgradeCost } from "@/game/data";
import type { AbilityId, CosmeticId, Modifier, RunSnapshot, SaveData, UpgradeId } from "@/game/types";

export function MenuScreen({ save, run, abilities, setAbilities, onContinue, onNew, onDaily, onNavigate }: {
  save: SaveData; run: RunSnapshot | null; abilities: AbilityId[]; setAbilities: Dispatch<SetStateAction<AbilityId[]>>;
  onContinue: () => void; onNew: () => void; onDaily: () => void; onNavigate: (screen: string) => void;
}) {
  return <main className="menu-layout">
    <section className="hero-panel">
      <div className="hero-grid" />
      <div className="tower-ghost"><span>100</span><small>FLOORS</small></div>
      <div className="hero-copy">
        <div className="eyebrow">THE TOWER IS WAITING</div>
        <h1>LAST<br /><em>FLOOR</em></h1>
        <p>100 floors. Every room is a decision. The top is the only answer.</p>
        <div className="menu-buttons">
          {run && <button className="big-action primary" onClick={onContinue}>CONTINUE <b>↗</b></button>}
          <button className="big-action" onClick={onNew}>{run ? "NEW RUN" : "ENTER THE TOWER"} <b>↗</b></button>
          <button className="big-action ghost" onClick={onDaily}>DAILY RUN <b>◷</b></button>
        </div>
      </div>
    </section>
    <aside className="menu-side">
      <div className="side-card loadout-card">
        <div className="side-card-title"><span>LOADOUT</span><small>CHOOSE 2</small></div>
        <div className="loadout-grid">
          {(Object.keys(ABILITIES) as AbilityId[]).map((id) => {
            const active = abilities.includes(id);
            return <button key={id} className={active ? "loadout-option selected" : "loadout-option"} onClick={() => setAbilities((current) => {
              if (active) return current.length > 1 ? current.filter((item) => item !== id) : current;
              return current.length >= 2 ? [current[1]!, id] : [...current, id];
            })}>
              <span>{ABILITIES[id].symbol}</span><b>{id}</b><small>{ABILITIES[id].description}</small>
            </button>;
          })}
        </div>
      </div>
      <div className="stat-strip">
        <div><strong>{String(save.stats.bestFloor).padStart(2, "0")}</strong><span>BEST FLOOR</span></div>
        <div><strong>{save.stats.bestScore.toLocaleString("fr-FR")}</strong><span>BEST SCORE</span></div>
        <div><strong>{save.stats.totalRuns}</strong><span>RUNS</span></div>
      </div>
      <div className="menu-nav-grid">
        <button onClick={() => onNavigate("tower")}>TOWER <span>↑</span></button>
        <button onClick={() => onNavigate("profile")}>PROFILE <span>◫</span></button>
        <button onClick={() => onNavigate("shop")}>ARMORY <span>◆</span></button>
        <button onClick={() => onNavigate("achievements")}>RECORDS <span>★</span></button>
      </div>
      <div className="menu-footer">
        <span>◉ {save.coins.toLocaleString("fr-FR")}</span><span>◆ {save.shards}</span><span>⌑ {save.keys}</span>
        <button onClick={() => onNavigate("options")}>OPTIONS</button>
      </div>
    </aside>
  </main>;
}

export function ModifierScreen({ onChoose }: { onChoose: (modifier: Modifier) => void }) {
  return <main className="modal-page">
    <div className="modifier-head"><span className="eyebrow">CHOOSE YOUR FATE</span><h1>HIGHER RISK.<br /><em>HIGHER REWARD.</em></h1><p>The tower noticed you. Pick one rule to carry forward.</p></div>
    <div className="modifier-grid">
      {MODIFIERS.map((modifier, index) => <button key={modifier.id} className="modifier-card" onClick={() => onChoose(modifier)}>
        <span className="modifier-index">0{index + 1}</span><strong>{modifier.name}</strong><small>{modifier.effect}</small><p>{modifier.description}</p><b>REWARD ×{modifier.rewardMultiplier.toFixed(1)}</b>
      </button>)}
    </div>
  </main>;
}

export function GameOverScreen({ run, onRetry, onCheckpoint, onMenu, victory }: {
  run: RunSnapshot; onRetry: () => void; onCheckpoint?: () => void; onMenu: () => void; victory?: boolean;
}) {
  return <main className={victory ? "end-screen victory" : "end-screen"}>
    <div className="end-noise" /><span className="eyebrow">{victory ? "THE TOWER REMEMBERS" : "RUN OVER"}</span>
    <h1>{victory ? "THE LAST FLOOR" : "FLOOR " + String(Math.min(100, run.floor)).padStart(2, "0")}</h1>
    <p className="end-sub">{victory ? "THE ARCHITECT HAS NO MORE ROOMS." : "The tower does not forgive hesitation."}</p>
    <div className="end-stats">
      <div><span>SCORE</span><strong>{run.score.toLocaleString("fr-FR")}</strong></div><div><span>FLOORS</span><strong>{run.floorsCleared}</strong></div>
      <div><span>COINS</span><strong>+{run.runCoins}</strong></div><div><span>COMBO</span><strong>×{run.bestCombo}</strong></div>
    </div>
    <div className="end-actions">
      {!victory && onCheckpoint && <button className="big-action" onClick={onCheckpoint}>RESTORE CHECKPOINT <b>↻</b></button>}
      <button className="big-action primary" onClick={onRetry}>TRY AGAIN <b>↗</b></button>
      <button className="text-button" onClick={onMenu}>MAIN MENU</button>
    </div>
  </main>;
}

export function TowerScreen({ save, run, onRun }: { save: SaveData; run: RunSnapshot | null; onRun: () => void }) {
  const current = run?.floor ?? 0;
  return <main className="page-shell">
    <div className="page-head"><span className="eyebrow">ASCENSION MAP</span><h1>THE TOWER</h1><p>Checkpoints every ten floors. Bosses every twenty-five.</p></div>
    <div className="tower-map">
      {Array.from({ length: 100 }, (_, index) => {
        const floor = 100 - index;
        const zone = ZONES.find((item) => floor >= item.range[0] && floor <= item.range[1])!;
        const boss = [25, 50, 75, 100].includes(floor);
        const checkpoint = floor % 10 === 0;
        const reached = floor <= save.stats.bestFloor;
        return <div key={floor} className={"tower-node " + (floor === current ? "current " : "") + (reached ? "reached " : "") + (boss ? "boss" : "")}>
          <span>{String(floor).padStart(2, "0")}</span><b>{boss ? "BOSS" : checkpoint ? "CHECKPOINT" : zone.name}</b>
        </div>;
      })}
    </div>
    <button className="big-action" onClick={onRun}>{run ? "RETURN TO RUN" : "START RUN"} <b>↗</b></button>
  </main>;
}

export function ProfileScreen({ save, onMenu }: { save: SaveData; onMenu: () => void }) {
  const stats: Array<[string, string | number]> = [
    ["BEST FLOOR", save.stats.bestFloor], ["BEST SCORE", save.stats.bestScore.toLocaleString("fr-FR")],
    ["TOTAL RUNS", save.stats.totalRuns], ["TOTAL FLOORS", save.stats.totalFloors],
    ["COINS EARNED", save.stats.coinsEarned.toLocaleString("fr-FR")], ["PUZZLES SOLVED", save.stats.puzzlesSolved],
    ["ENEMIES DEFEATED", save.stats.enemiesDefeated], ["DEATHS", save.stats.deaths],
    ["PERFECT FLOORS", save.stats.perfectFloors], ["BEST COMBO", "×" + save.stats.bestCombo],
    ["BOSS WINS", save.stats.bossWins], ["FASTEST FLOOR", save.stats.fastestFloor === 9999 ? "—" : String(save.stats.fastestFloor) + "s"],
  ];
  return <main className="page-shell"><div className="page-head"><span className="eyebrow">PERSONAL ARCHIVE</span><h1>PROFILE</h1><p>Your run history, your records, your climb.</p></div>
    <div className="profile-grid">{stats.map(([label, value]) => <div className="profile-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="profile-bottom"><div><span>DAILY BEST</span><strong>FLOOR {save.stats.dailyBestFloor}</strong></div><div><span>PREVIOUS SCORE</span><strong>{save.stats.previousScore.toLocaleString("fr-FR")}</strong></div><button className="text-button" onClick={onMenu}>← MENU</button></div>
  </main>;
}

export function AchievementsScreen({ save, onMenu }: { save: SaveData; onMenu: () => void }) {
  return <main className="page-shell"><div className="page-head"><span className="eyebrow">PROTOCOLS</span><h1>ACHIEVEMENTS</h1><p>{save.achievements.length}/{ACHIEVEMENTS.length} protocols unlocked.</p></div>
    <div className="achievement-grid">{ACHIEVEMENTS.map((achievement) => {
      const unlocked = save.achievements.includes(achievement.id);
      return <div className={unlocked ? "achievement-card unlocked" : "achievement-card"} key={achievement.id}><span>{unlocked ? "◆" : "?"}</span><div><strong>{unlocked ? achievement.name : "CLASSIFIED"}</strong><small>{achievement.description}</small></div><b>{unlocked ? "UNLOCKED" : "LOCKED"}</b></div>;
    })}</div><button className="text-button" onClick={onMenu}>← MENU</button>
  </main>;
}

export function ShopScreen({ save, onUpgrade, onCosmetic, onMenu }: { save: SaveData; onUpgrade: (id: UpgradeId) => void; onCosmetic: (id: CosmeticId) => void; onMenu: () => void }) {
  return <main className="page-shell"><div className="page-head"><span className="eyebrow">TOWER ARMORY</span><h1>ARMORY</h1><p>Permanent upgrades change how runs feel. Cosmetics never change power.</p></div>
    <div className="shop-section"><div className="section-label">UPGRADES</div><div className="upgrade-grid">{(Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
      const item = UPGRADES[id]; const level = save.upgrades[id]; const cost = upgradeCost(id, level);
      return <button key={id} className="upgrade-card" onClick={() => onUpgrade(id)} disabled={level >= item.max || save.coins < cost}>
        <div><span>{id}</span><b>LV. {level}/{item.max}</b></div><strong>{item.name}</strong><small>{item.description}</small>
        <div className="upgrade-meter">{Array.from({ length: item.max }, (_, i) => <i key={i} className={i < level ? "filled" : ""} />)}</div>
        <em>{level >= item.max ? "MAXED" : "◉ " + cost}</em>
      </button>;
    })}</div></div>
    <div className="shop-section"><div className="section-label">COSMETICS</div><div className="cosmetic-grid">{(Object.keys(COSMETICS) as CosmeticId[]).map((id) => {
      const item = COSMETICS[id]; const owned = save.ownedCosmetics.includes(id); const locked = id === "VOID" && save.stats.bestFloor < 75;
      return <button key={id} className={save.selectedCosmetic === id ? "cosmetic-card selected" : "cosmetic-card"} onClick={() => onCosmetic(id)} disabled={locked}>
        <div className="skin-preview" style={{ "--skin": item.accent } as CSSProperties}><span /></div><strong>{item.name}</strong><small>{locked ? "Reach Floor 75" : item.description}</small><b>{owned ? "EQUIP" : item.kind === "coins" ? "◉ " + item.cost : "◆ " + item.cost}</b>
      </button>;
    })}</div></div><button className="text-button" onClick={onMenu}>← MENU</button>
  </main>;
}

export function OptionsScreen({ save, setSave, onReset, onMenu }: { save: SaveData; setSave: Dispatch<SetStateAction<SaveData>>; onReset: () => void; onMenu: () => void }) {
  const patch = (settings: SaveData["settings"]) => { const next = { ...save, settings }; setSave(next); localStorage.setItem("last-floor-save-v1", JSON.stringify(next)); };
  return <main className="page-shell narrow"><div className="page-head"><span className="eyebrow">SYSTEM CONTROL</span><h1>OPTIONS</h1></div>
    <div className="options-card"><label><span>SOUND</span><input type="checkbox" checked={save.settings.sound} onChange={(e) => patch({ ...save.settings, sound: e.target.checked })} /></label>
      <label><span>VOLUME</span><input type="range" min="0" max="1" step="0.05" value={save.settings.volume} onChange={(e) => patch({ ...save.settings, volume: Number(e.target.value) })} /></label>
      <label><span>REDUCED MOTION</span><input type="checkbox" checked={save.settings.reducedMotion} onChange={(e) => patch({ ...save.settings, reducedMotion: e.target.checked })} /></label>
    </div>
    <div className="danger-zone"><span>LOCAL SAVE</span><p>Resetting deletes progression on this browser.</p><button className="danger-button" onClick={onReset}>RESET SAVE</button></div>
    <button className="text-button" onClick={onMenu}>← MENU</button>
  </main>;
}
