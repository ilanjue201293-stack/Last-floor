"use client";

import { useEffect, useMemo, useState } from "react";
import {
  advanceAfterNarration,
  applyChoice,
  makeEvent,
  makeInitialState
} from "@/game/engine";
import type {
  GameEvent,
  GameState,
  Passenger,
  ScheduledConsequence,
  VisualCue
} from "@/game/types";

type Phase = "lobby" | "event" | "resolving" | "consequence" | "dead" | "won";

const SAVE_KEY = "night-train-active-v2";
const LAST_RESULT_KEY = "night-train-last-result-v2";

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 5; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)] ?? "X";
  }
  return "NT-" + result;
}

function makeSeed() {
  return String(Date.now()) + "-" + Math.floor(Math.random() * 1000000);
}

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed.status === "playing" ? parsed : null;
  } catch {
    return null;
  }
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

function saveLastResult(state: GameState) {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(state));
  } catch {}
}

function useTypewriter(text: string, speed: number) {
  const [visible, setVisible] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    setVisible("");
    setDone(text.length === 0);
    if (!text) return;

    const timer = window.setInterval(function type() {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, speed);

    return function cleanup() {
      window.clearInterval(timer);
    };
  }, [text, speed]);

  return { visible, done };
}

function Lobby({
  saved,
  lastResult,
  onStart,
  onResume
}: {
  saved: GameState | null;
  lastResult: GameState | null;
  onStart: (name: string, mode: "SHORT" | "CLASSIC") => void;
  onResume: () => void;
}) {
  const [name, setName] = useState(saved?.playerName ?? "VOYAGEUR");
  const [mode, setMode] = useState<"SHORT" | "CLASSIC">("CLASSIC");
  const [code, setCode] = useState(saved?.sessionCode ?? makeCode());

  return (
    <main className="lobby-shell">
      <div className="lobby-noise" />
      <div className="lobby-layout">
        <section className="lobby-hero">
          <div className="brand-big">
            <span className="brand-glyph">NT</span>
            <div>
              <strong>NIGHT TRAIN</strong>
              <small>SESSION DE VOYAGE · 01</small>
            </div>
          </div>
          <div className="hero-copy">
            <span>RENTREZ CHEZ VOUS.</span>
            <h1>Le train avance.<br /><em>Vous choisissez.</em></h1>
            <p>
              Aucun déplacement. Aucun combat. Seulement des décisions.
              Une action peut être correcte maintenant et devenir une catastrophe
              plusieurs arrêts plus tard.
            </p>
          </div>
          <div className="lobby-train-preview">
            <div className="preview-city">
              {Array.from({ length: 12 }).map(function (_, index) {
                return <i key={index} style={{ height: (28 + (index % 5) * 11) + "%" }} />;
              })}
            </div>
            <div className="preview-track"><i /><i /></div>
            <div className="preview-train">
              <span className="preview-cab">N-04</span>
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="lobby-foot">
            <span>UNE SESSION = UN TRAJET</span>
            <span>SAUVEGARDE LOCALE</span>
            <span>MOBILE FIRST</span>
          </div>
        </section>

        <section className="lobby-card">
          <div className="lobby-card-top">
            <div>
              <span className="section-tag">LOBBY</span>
              <h2>Préparer le trajet</h2>
            </div>
            <div className="status-dot"><i /> HORS LIGNE</div>
          </div>

          {saved && (
            <div className="resume-panel">
              <div>
                <span>PARTIE EN COURS</span>
                <strong>{saved.station} · arrêt {saved.round}/{saved.maxRounds}</strong>
                <small>{saved.playerName} · {saved.sessionCode}</small>
              </div>
              <button onClick={onResume}>REPRENDRE →</button>
            </div>
          )}

          <label className="field-label">NOM DU VOYAGEUR</label>
          <div className="field-row">
            <input maxLength={16} value={name} onChange={function (e) { setName(e.target.value.toUpperCase()); }} placeholder="VOYAGEUR" />
            <div className="avatar-card">{(name.trim()[0] ?? "N")}</div>
          </div>

          <label className="field-label">MODE DE TRAJET</label>
          <div className="mode-grid">
            <button className={mode === "SHORT" ? "mode active" : "mode"} onClick={() => setMode("SHORT")}>
              <strong>COURT</strong>
              <span>12 arrêts · rythme rapide</span>
            </button>
            <button className={mode === "CLASSIC" ? "mode active" : "mode"} onClick={() => setMode("CLASSIC")}>
              <strong>CLASSIQUE</strong>
              <span>24 arrêts · plus de chaînes</span>
            </button>
          </div>

          <div className="session-box">
            <div>
              <span>SESSION</span>
              <strong>{code}</strong>
            </div>
            <button onClick={function () { setCode(makeCode()); }}>NOUVEAU CODE</button>
          </div>

          <div className="lobby-info">
            <div><span>OBJECTIF</span><strong>MAISON</strong></div>
            <div><span>JOUEUR</span><strong>1 / 1</strong></div>
            <div><span>DIFFICULTÉ</span><strong>ADAPTATIVE</strong></div>
          </div>

          <button className="start-button" onClick={function () { onStart(name.trim() || "VOYAGEUR", mode); }}>
            CRÉER LA PARTIE
            <span>→</span>
          </button>

          {lastResult && (
            <div className="last-result">
              <span>DERNIER TRAJET</span>
              <strong>{lastResult.status === "won" ? "ARRIVÉ À MAISON" : "TRAJET INTERROMPU"}</strong>
              <small>{lastResult.bestRound} arrêts · {Math.round(lastResult.score)} pts · {lastResult.trainChanges} correspondance(s)</small>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function TrainGame() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [game, setGame] = useState<GameState | null>(null);
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [saved, setSaved] = useState<GameState | null>(null);
  const [lastResult, setLastResult] = useState<GameState | null>(null);
  const [activeText, setActiveText] = useState("");
  const [turnResult, setTurnResult] = useState<ReturnType<typeof advanceAfterNarration> | null>(null);
  const [visualCue, setVisualCue] = useState<VisualCue>("none");
  const [lastPassengerId, setLastPassengerId] = useState<string | null>(null);
  const [consequenceIndex, setConsequenceIndex] = useState(0);
  const [deathCause, setDeathCause] = useState<ScheduledConsequence | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const typing = useTypewriter(activeText, phase === "consequence" ? 16 : phase === "resolving" ? 18 : 21);

  useEffect(() => {
    const loaded = loadState();
    setSaved(loaded);
    try {
      const raw = localStorage.getItem(LAST_RESULT_KEY);
      if (raw) setLastResult(JSON.parse(raw) as GameState);
    } catch {}
  }, []);

  useEffect(() => {
    if (game && phase !== "lobby") saveState(game);
  }, [game, phase]);

  useEffect(() => {
    if (!game || !event || !typing.done) return;

    if (phase === "resolving") {
      const timer = window.setTimeout(function afterAction() {
        const result = turnResult;
        if (!result) return;
        if (result.resolved.length > 0) {
          setGame(result.state);
          setConsequenceIndex(0);
          setActiveText(result.resolved[0]?.text ?? "");
          setPhase("consequence");
          return;
        }
        setGame(result.state);
        if (result.state.status === "dead") {
          saveLastResult(result.state);
          setDeathCause(null);
          setPhase("dead");
          return;
        }
        if (result.state.status === "won") {
          saveLastResult(result.state);
          setPhase("won");
          return;
        }
        const nextEvent = makeEvent(result.state);
        setEvent(nextEvent);
        setActiveText(nextEvent.body);
        setVisualCue("none");
        setPhase("event");
      }, 650);
      return function cleanup() { window.clearTimeout(timer); };
    }

    if (phase === "consequence") {
      const timer = window.setTimeout(function afterConsequence() {
        const result = turnResult;
        if (!result) return;
        const nextIndex = consequenceIndex + 1;
        if (nextIndex < result.resolved.length) {
          setConsequenceIndex(nextIndex);
          setActiveText(result.resolved[nextIndex]?.text ?? "");
          return;
        }

        if (result.state.status === "dead") {
          saveLastResult(result.state);
          setDeathCause(result.resolved.find(function findFatal(item) { return item.fatal; }) ?? result.resolved[0] ?? null);
          setPhase("dead");
          return;
        }

        if (result.state.status === "won") {
          saveLastResult(result.state);
          setPhase("won");
          return;
        }

        const nextEvent = makeEvent(result.state);
        setEvent(nextEvent);
        setActiveText(nextEvent.body);
        setVisualCue("none");
        setPhase("event");
      }, 850);
      return function cleanup() { window.clearTimeout(timer); };
    }
  }, [typing.done, phase, game, event, turnResult, consequenceIndex]);

  const progress = useMemo(function progressValue() {
    if (!game) return 0;
    return Math.min(100, ((game.round - 1) / Math.max(1, game.maxRounds - 1)) * 100);
  }, [game]);

  const startNew = (name: string, mode: "SHORT" | "CLASSIC") => {
    const fresh = makeInitialState(makeSeed(), name, mode, makeCode());
    setGame(fresh);
    const nextEvent = makeEvent(fresh);
    setEvent(nextEvent);
    setActiveText(nextEvent.body);
    setTurnResult(null);
    setVisualCue("none");
    setLastPassengerId(null);
    setDeathCause(null);
    setShowJournal(false);
    setShowExit(false);
    setPhase("event");
  };

  const resume = () => {
    const current = loadState();
    if (!current) return;
    setGame(current);
    const nextEvent = makeEvent(current);
    setEvent(nextEvent);
    setActiveText(nextEvent.body);
    setTurnResult(null);
    setVisualCue("none");
    setShowJournal(false);
    setPhase("event");
  };

  const choose = (choiceId: string) => {
    if (!game || !event || phase !== "event" || !typing.done) return;
    const selected = event.choices.find(function find(c) { return c.id === choiceId; });
    if (!selected) return;

    const applied = applyChoice(game, event, selected);
    const advanced = advanceAfterNarration(applied.state);
    const result = {
      ...advanced,
      immediateState: applied.state,
      immediateText: applied.immediateText
    };

    setGame(applied.state);
    setTurnResult(result);
    setActiveText(applied.immediateText);
    setVisualCue(selected.visualCue);

    const newPassenger = selected.effect.addPassenger;
    setLastPassengerId(newPassenger?.id ?? null);
    if (selected.visualCue === "board") {
      window.setTimeout(function clearNewPassenger() { setLastPassengerId(null); }, 1600);
    }

    setPhase("resolving");
  };

  const returnToLobby = () => {
    setShowExit(false);
    const current = loadState();
    setSaved(current);
    setPhase("lobby");
  };

  const resetSave = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(LAST_RESULT_KEY);
    } catch {}
    setSaved(null);
    setLastResult(null);
    setShowExit(false);
    setGame(null);
    setEvent(null);
    setPhase("lobby");
  };

  if (phase === "lobby") {
    return <Lobby saved={saved} lastResult={lastResult} onStart={startNew} onResume={resume} />;
  }

  if (!game || !event) return null;

  const health = clamp(game.health);
  const supplies = clamp(game.supplies);
  const stress = clamp(game.stress);

  return (
    <main className="game-shell">
      <div className="game-backdrop" />
      <header className="game-topbar">
        <button className="mini-brand" onClick={function () { setShowExit(true); }}>
          <span>NT</span>
          <div><strong>NIGHT TRAIN</strong><small>{game.sessionCode}</small></div>
        </button>

        <div className="route-status">
          <span>DÉPART</span>
          <b>{game.station}</b>
          <i />
          <strong>MAISON</strong>
        </div>

        <div className="top-actions">
          <span className="round-counter">{String(game.round).padStart(2, "0")} / {String(game.maxRounds).padStart(2, "0")}</span>
          <button className="top-button" onClick={function () { setShowJournal(true); }}>JOURNAL</button>
        </div>
      </header>

      <div className="route-progress">
        <span style={{ width: progress + "%" }} />
      </div>

      <div className="game-layout">
        <section className="scene-panel">
          <div className="scene-meta">
            <div>
              <span>{game.clock} · {game.weather}</span>
              <strong>{game.station}</strong>
              <small>{game.district} · quai {game.platform}</small>
            </div>
            <div className="train-id">
              <span>LIGNE</span>
              <strong>{game.trainLine}</strong>
              <small>RAME {String(game.trainNumber).padStart(3, "0")}</small>
            </div>
          </div>

          <TrainScene state={game} cue={visualCue} lastPassengerId={lastPassengerId} />

          <div className="resource-row">
            <Meter label="INTÉGRITÉ" value={health} icon="♥" tone="health" />
            <Meter label="RÉSERVES" value={supplies} icon="▣" tone="supplies" />
            <Meter label="STRESS" value={stress} icon="!" tone="stress" />
            <div className="money-card"><span>ARGENT</span><strong>{game.money}€</strong><small>{Math.round(game.score)} pts</small></div>
          </div>

          <div className="passenger-strip">
            <div className="passenger-title">
              <span>À BORD</span>
              <strong>{game.passengers.length} voyageur{game.passengers.length > 1 ? "s" : ""}</strong>
            </div>
            <div className="passenger-list">
              {game.passengers.slice(0, 12).map(function (person) {
                return <PassengerAvatar key={person.id} person={person} />;
              })}
              {game.passengers.length > 12 && <span className="more-passengers">+{game.passengers.length - 12}</span>}
            </div>
            <div className="transfer-count">{game.trainChanges} TRANSFERT{game.trainChanges > 1 ? "S" : ""}</div>
          </div>
        </section>

        <section className="decision-panel">
          <div className="decision-kicker">
            <span>{phase === "resolving" ? "ACTION" : phase === "consequence" ? "CONSEQUENCE" : event.tag}</span>
            <b>{event.location}</b>
          </div>

          <div className="story-block">
            <div className="story-line"><i /> <span>{phase === "resolving" ? "CE QUI VIENT DE SE PASSER" : phase === "consequence" ? "UNE DÉCISION PLUS ANCIENNE RÉPOND" : "IL SE PASSE QUELQUE CHOSE"}</span></div>
            <h1>{phase === "resolving" ? "Action enregistrée" : phase === "consequence" ? "Et maintenant..." : event.title}</h1>
            <p>{typing.visible}<span className={typing.done ? "caret hidden" : "caret"} /></p>
          </div>

          {phase === "event" && (
            <>
              <div className="station-note"><span>STATION</span><strong>{event.stationNote}</strong></div>
              {game.pending.length > 0 && (
                <div className="pending-hint">
                  <span>☁</span>
                  <div><strong>{game.pending.length} suite{game.pending.length > 1 ? "s" : ""} en cours</strong><small>Tout n'est pas forcément lié à ce que tu viens de voir.</small></div>
                </div>
              )}
              <div className="choices">
                {event.choices.map(function (choice, index) {
                  return (
                    <button
                      key={choice.id}
                      className={"choice-card tone-" + choice.tone}
                      onClick={function () { choose(choice.id); }}
                      disabled={!typing.done}
                    >
                      <span className="choice-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="choice-main"><strong>{choice.label}</strong><small>{choice.subtext}</small></span>
                      <span className="choice-arrow">→</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {phase === "resolving" && (
            <div className="resolution-chip"><i /> La scène se déroule maintenant.</div>
          )}

          {phase === "consequence" && (
            <div className="resolution-chip consequence"><i /> Cette réponse vient d'un choix fait plus tôt.</div>
          )}
        </section>
      </div>

      {(phase === "dead" || phase === "won") && (
        <EndOverlay
          won={phase === "won"}
          game={game}
          cause={deathCause}
          onRestart={function () {
            setSaved(null);
            startNew(game.playerName, game.mode);
          }}
          onLobby={returnToLobby}
        />
      )}

      {showJournal && (
        <div className="drawer-backdrop" onClick={function () { setShowJournal(false); }}>
          <aside className="journal-drawer" onClick={function (e) { e.stopPropagation(); }}>
            <div className="drawer-head"><span>JOURNAL</span><button onClick={function () { setShowJournal(false); }}>×</button></div>
            <div className="journal-list">
              {game.history.slice(0, 18).map(function (item, index) {
                return <div className="journal-line" key={item + "-" + index}><i>{String(index + 1).padStart(2, "0")}</i><span>{item}</span></div>;
              })}
            </div>
          </aside>
        </div>
      )}

      {showExit && (
        <div className="modal-backdrop">
          <div className="exit-modal">
            <span>SESSION {game.sessionCode}</span>
            <h2>Quitter le trajet ?</h2>
            <p>La partie reste sauvegardée. Tu pourras la reprendre depuis le lobby.</p>
            <div className="modal-buttons">
              <button className="modal-secondary" onClick={function () { setShowExit(false); }}>CONTINUER</button>
              <button className="modal-primary" onClick={returnToLobby}>RETOUR AU LOBBY</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TrainScene({
  state,
  cue,
  lastPassengerId
}: {
  state: GameState;
  cue: VisualCue;
  lastPassengerId: string | null;
}) {
  const cars = [0, 1, 2, 3];
  return (
    <div className={"train-scene cue-" + cue}>
      <div className="city-grid">
        {Array.from({ length: 18 }).map(function (_, index) {
          return <i key={index} style={{ height: (24 + ((index * 17) % 58)) + "%" }} />;
        })}
      </div>
      <div className="platform-line top"><span>{state.station}</span><b>QUAI {state.platform}</b></div>
      <div className="track-lines"><i /><i /><i /></div>
      <div className="train-shadow" />
      <div className="train-body">
        <div className="train-cab">
          <div className="cab-window" />
          <span>{state.trainLine}</span>
        </div>
        {cars.map(function (carIndex) {
          const occupants = state.passengers.slice(carIndex * 3, carIndex * 3 + 3);
          return (
            <div className="car" key={carIndex}>
              <div className="car-roof"><span>CAR {String(carIndex + 1).padStart(2, "0")}</span></div>
              <div className="car-window-band">
                <i /><i /><i /><i />
              </div>
              <div className="seat-bank top"><i /><i /><i /><i /></div>
              <div className="aisle">
                {occupants.map(function (person) {
                  return <PassengerDot key={person.id} person={person} fresh={person.id === lastPassengerId} />;
                })}
              </div>
              <div className="seat-bank bottom"><i /><i /><i /><i /></div>
              <div className="door-mark left" /><div className="door-mark right" />
            </div>
          );
        })}
      </div>
      <div className="platform-sign">
        <span>PROCHAIN ARRÊT</span>
        <strong>{state.round >= state.maxRounds - 2 ? "MAISON" : "CONTINUER"}</strong>
      </div>
      <div className="scene-cue">
        {cue === "board" && "NOUVEAU PASSAGER À BORD"}
        {cue === "switch" && "NOUVELLE RAME"}
        {cue === "warn" && "SYSTÈME EN ALERTE"}
        {cue === "impact" && "CHOC DANS LA RAME"}
      </div>
    </div>
  );
}

function PassengerDot({ person, fresh }: { person: Passenger; fresh: boolean }) {
  return (
    <span className={"passenger-dot accent-" + person.accent + (fresh ? " passenger-new" : "")} title={person.name}>
      <i>{person.name.slice(0, 1)}</i>
    </span>
  );
}

function PassengerAvatar({ person }: { person: Passenger }) {
  return <span className={"passenger-avatar accent-" + person.accent} title={person.name + " · " + person.age + " ans · " + person.note}><i>{person.name.slice(0, 1)}</i></span>;
}

function Meter({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: "health" | "supplies" | "stress" }) {
  return (
    <div className={"meter-card meter-" + tone}>
      <div><span>{label}</span><strong>{icon} {Math.round(value)}</strong></div>
      <div className="meter-bar"><i style={{ width: value + "%" }} /></div>
    </div>
  );
}

function EndOverlay({
  won,
  game,
  cause,
  onRestart,
  onLobby
}: {
  won: boolean;
  game: GameState;
  cause: ScheduledConsequence | null;
  onRestart: () => void;
  onLobby: () => void;
}) {
  return (
    <div className="end-backdrop">
      <div className={"end-card " + (won ? "end-won" : "end-dead")}>
        <span className="end-tag">{won ? "TERMINUS" : "TRAJET INTERROMPU"}</span>
        <div className="end-icon">{won ? "⌂" : "×"}</div>
        <h2>{won ? "Tu es rentré." : "Tu n'es pas arrivé."}</h2>
        <p>
          {won
            ? "Les portes de MAISON se sont ouvertes. Tout ce qui s'est passé sur la route reste derrière toi."
            : "La partie s'arrête ici. Le détail important est parfois caché plusieurs arrêts avant."}
        </p>

        {!won && cause && (
          <div className="death-cause">
            <span>RÉPONSE RETARDÉE</span>
            <strong>{cause.text}</strong>
            <small>Déclenchée après l'arrêt {String(cause.sourceRound).padStart(2, "0")} · {cause.sourceTitle}</small>
          </div>
        )}

        <div className="end-stat-row">
          <div><span>ARRÊTS</span><strong>{Math.min(game.round, game.maxRounds)}</strong></div>
          <div><span>DÉCISIONS</span><strong>{game.decisions}</strong></div>
          <div><span>SCORE</span><strong>{Math.round(game.score)}</strong></div>
          <div><span>TRANSFERTS</span><strong>{game.trainChanges}</strong></div>
        </div>

        <div className="end-actions">
          <button className="modal-secondary" onClick={onLobby}>LOBBY</button>
          <button className="modal-primary" onClick={onRestart}>{won ? "REFAIRE LE TRAJET" : "REPRENDRE UN TRAIN"}</button>
        </div>
      </div>
    </div>
  );
}
