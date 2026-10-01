"use client";

import { useEffect, useMemo, useState } from "react";
import { advanceRound, displayPending, makeEvent, makeInitialState, applyChoice } from "@/game/engine";
import type { GameEvent, GameState, Passenger, ScheduledConsequence } from "@/game/types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function saveState(state: GameState) {
  try {
    localStorage.setItem("night-train-save-v1", JSON.stringify(state));
  } catch {}
}

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem("night-train-save-v1");
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

const NEW_SEED = () => `${Date.now()}-${Math.random()}`;

export default function TrainGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [lastResolved, setLastResolved] = useState<ScheduledConsequence[]>([]);
  const [deathCause, setDeathCause] = useState<ScheduledConsequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const saved = loadState();
    if (saved?.status === "playing") {
      setState(saved);
      setEvent(makeEvent(saved));
    } else {
      const fresh = makeInitialState(NEW_SEED());
      setState(fresh);
      setEvent(makeEvent(fresh));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (state?.status === "playing") saveState(state);
  }, [state]);

  const progress = state ? ((state.round - 1) / (state.totalRounds - 1)) * 100 : 0;
  const pending = state ? displayPending(state) : [];

  const trainOccupants = useMemo(() => {
    if (!state) return [];
    return [...state.passengers].slice(0, 8);
  }, [state]);

  if (loading || !state || !event) {
    return <main className="boot-screen"><div className="boot-logo">NIGHT TRAIN</div><div className="boot-line">initialisation…</div></main>;
  }

  const beginAgain = () => {
    const fresh = makeInitialState(NEW_SEED());
    setLastResolved([]);
    setDeathCause(null);
    setShowLog(false);
    setState(fresh);
    setEvent(makeEvent(fresh));
  };

  const choose = (choiceId: string) => {
    if (state.status !== "playing") return;
    const choice = event.choices.find((item) => item.id === choiceId);
    if (!choice) return;

    const chosen = applyChoice(state, event, choice);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 280);

    const next = advanceRound(chosen);
    setLastResolved(next.resolved);
    setState(next.state);

    if (next.state.status === "dead") {
      setDeathCause(next.death ?? next.resolved[0] ?? null);
      setEvent(null);
      return;
    }
    if (next.state.status === "won") {
      setEvent(null);
      return;
    }
    setEvent(makeEvent(next.state));
  };

  const resetSave = () => {
    localStorage.removeItem("night-train-save-v1");
    beginAgain();
  };

  const health = clamp(state.health);
  const supplies = clamp(state.supplies);
  const stress = clamp(state.stress);

  return (
    <main className={`game-shell ${pulse ? "pulse" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">NT</span>
          <div>
            <strong>NIGHT TRAIN</strong>
            <small>RENTREZ CHEZ VOUS</small>
          </div>
        </div>
        <div className="route-mini">
          <span>TERMINUS</span>
          <strong>MAISON</strong>
          <i />
          <b>{state.round}/{state.totalRounds}</b>
        </div>
        <button className="ghost-btn" onClick={() => setShowLog((value) => !value)}>{showLog ? "FERMER" : "JOURNAL"}</button>
      </header>

      <section className="progress-wrap">
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-label"><span>DÉPART</span><b>{state.station}</b><span>MAISON</span></div>
      </section>

      <div className="layout">
        <section className="scene-card">
          <div className="scene-head">
            <div>
              <span className="eyebrow">{state.clock} · {state.weather}</span>
              <h1>{state.station}</h1>
              <p>{state.district} · ligne {state.trainLine} · rame {String(state.trainNo).padStart(3, "0")}</p>
            </div>
            <div className="round-chip">ARRÊT {String(state.round).padStart(2, "0")}</div>
          </div>

          <div className="train-stage">
            <div className="city-glow glow-a" />
            <div className="city-glow glow-b" />
            <div className="track">
              {Array.from({ length: 14 }).map((_, index) => <i key={index} />)}
            </div>
            <div className="train-shadow" />

            <div className="train" aria-label="Vue du dessus du train">
              <div className="train-nose"><span>{state.trainLine}</span></div>
              {[0, 1, 2].map((carriage) => (
                <div className="carriage" key={carriage}>
                  <div className="door left" />
                  <div className="door right" />
                  <div className="seat-row top">{[0,1,2].map((seat) => <span key={seat} />)}</div>
                  <div className="aisle">
                    {trainOccupants.slice(carriage * 3, carriage * 3 + 3).map((person) => <PassengerDot person={person} key={person.id} />)}
                  </div>
                  <div className="seat-row bottom">{[0,1,2].map((seat) => <span key={seat} />)}</div>
                  <div className="carriage-label">{String(carriage + 1).padStart(2, "0")}</div>
                </div>
              ))}
            </div>

            <div className="station-marker">
              <span className="marker-dot" />
              <strong>{state.station}</strong>
              <small>{state.district}</small>
            </div>
          </div>

          <div className="resource-grid">
            <Meter label="INTÉGRITÉ" value={health} icon="♥" />
            <Meter label="RÉSERVES" value={supplies} icon="▣" />
            <Meter label="STRESS" value={stress} invert icon="!" />
            <div className="resource-card money"><small>ARGENT</small><strong>{state.money}€</strong><span>+{state.score} score</span></div>
          </div>

          <div className="passenger-bar">
            <div><span>À BORD</span><strong>{state.passengers.length} passager{state.passengers.length > 1 ? "s" : ""}</strong></div>
            <div className="avatars">{state.passengers.slice(0, 8).map((person) => <PassengerAvatar person={person} key={person.id} />)}</div>
            <span className="train-changes">{state.trainChanges} CHANGEMENT{state.trainChanges > 1 ? "S" : ""}</span>
          </div>
        </section>

        {showLog ? (
          <aside className="decision-card journal-card">
            <div className="decision-top"><span>JOURNAL</span><b>DERNIERS ÉVÉNEMENTS</b></div>
            <div className="history">
              {state.history.slice(0, 12).map((entry, index) => <div className="history-row" key={`${entry}-${index}`}><i>{String(index + 1).padStart(2, "0")}</i><span>{entry}</span></div>)}
            </div>
            <button className="reset-link" onClick={resetSave}>EFFACER LA PARTIE</button>
          </aside>
        ) : state.status === "playing" ? (
          <aside className="decision-card">
            <div className="decision-top">
              <span>{event.tag}</span>
              <b>{event.location}</b>
            </div>
            <div className={`event-hero urgency-${event.urgency ?? "medium"}`}>
              <div className="event-kicker">IL SE PASSE QUELQUE CHOSE</div>
              <h2>{event.title}</h2>
              <p>{event.body}</p>
            </div>

            {pending.length > 0 && (
              <div className="pending">
                <div className="pending-title">CONSCÉQUENCES EN ATTENTE <span>?</span></div>
                {pending.map((item) => (
                  <div className="pending-item" key={item.id}>
                    <span>dans {item.dueRound - state.round} arrêt{item.dueRound - state.round > 1 ? "s" : ""}</span>
                    <strong>UNE CONSÉQUENCE EST EN APPROCHE</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="choices">
              {event.choices.map((choice, index) => (
                <button key={choice.id} className={`choice tone-${choice.tone}`} onClick={() => choose(choice.id)}>
                  <span className="choice-num">{String(index + 1).padStart(2, "0")}</span>
                  <span className="choice-content"><strong>{choice.label}</strong><small>{choice.text}</small></span>
                  <span className="choice-arrow">→</span>
                </button>
              ))}
            </div>
            <p className="hint">Aucune action n'est forcément bonne tout de suite. Certaines décisions te répondront plus tard.</p>
          </aside>
        ) : null}
      </div>

      {state.status === "dead" && (
        <EndScreen
          kind="dead"
          state={state}
          cause={deathCause}
          resolved={lastResolved}
          onRestart={beginAgain}
        />
      )}

      {state.status === "won" && (
        <EndScreen
          kind="won"
          state={state}
          cause={lastResolved[lastResolved.length - 1] ?? null}
          resolved={lastResolved}
          onRestart={beginAgain}
        />
      )}
    </main>
  );
}

function PassengerDot({ person }: { person: Passenger }) {
  return <span className={`passenger-dot accent-${person.accent}`} title={person.name} />;
}

function PassengerAvatar({ person }: { person: Passenger }) {
  return <span className={`avatar accent-${person.accent}`} title={`${person.name}, ${person.age} ans — ${person.note}`}><i>{person.name.slice(0, 1)}</i></span>;
}

function Meter({ label, value, icon, invert = false }: { label: string; value: number; icon: string; invert?: boolean }) {
  return (
    <div className={`resource-card meter-card ${invert ? "invert" : ""}`}>
      <div><small>{label}</small><strong>{icon} {Math.round(value)}</strong></div>
      <div className="meter"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function EndScreen({
  kind,
  state,
  cause,
  resolved,
  onRestart,
}: {
  kind: "dead" | "won";
  state: GameState;
  cause: ScheduledConsequence | null;
  resolved: ScheduledConsequence[];
  onRestart: () => void;
}) {
  const isWon = kind === "won";
  return (
    <div className="end-overlay">
      <div className="end-panel">
        <span className={`end-status ${isWon ? "good" : ""}`}>{isWon ? "TERMINUS" : "TRAJET INTERROMPU"}</span>
        <div className="end-symbol">{isWon ? "⌂" : "×"}</div>
        <h2>{isWon ? "TU ES RENTRÉ." : "TU N'ES PAS ARRIVÉ."}</h2>
        <p>{isWon ? "Les portes de MAISON se sont ouvertes. Le voyage est terminé." : "Le train peut continuer sans toi. La partie, elle, s'arrête ici."}</p>

        {!isWon && cause && (
          <div className="cause-box">
            <span>LA CONSÉQUENCE</span>
            <strong>{cause.text}</strong>
            <small>Déclenchée à l'arrêt {String(cause.sourceRound).padStart(2, "0")} · {cause.sourceTitle}</small>
          </div>
        )}

        {isWon && (
          <div className="arrival-lines">
            <span>Dernier arrêt</span><strong>MAISON</strong>
            <span>{state.trainChanges} changements de train</span><strong>{state.passengers.length} passagers croisés</strong>
          </div>
        )}

        <div className="end-stats">
          <div><span>ARRÊTS</span><strong>{state.bestRound}</strong></div>
          <div><span>DÉCISIONS</span><strong>{state.decisions}</strong></div>
          <div><span>SCORE</span><strong>{Math.round(state.score)}</strong></div>
        </div>

        {resolved.length > 0 && !isWon && (
          <div className="resolved-line">Dernière réponse : {resolved[0]?.text}</div>
        )}

        <button className="restart" onClick={onRestart}>{isWon ? "REFAIRE LE TRAJET" : "REPRENDRE UN TRAIN"}</button>
      </div>
    </div>
  );
}
