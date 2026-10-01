export type Tone = "safe" | "neutral" | "risky" | "danger";
export type VisualCue = "none" | "board" | "switch" | "warn" | "impact";

export type Passenger = {
  id: string;
  name: string;
  age: number;
  note: string;
  accent: "blue" | "red" | "amber" | "violet" | "green";
  hiddenRole?: "suspicious" | "child";
};

export type ConsequenceCondition = {
  passengerId?: string;
  blockedFlag?: string;
  requiredFlag?: string;
};

export type ScheduledConsequence = {
  id: string;
  dueRound: number;
  chainId: string;
  sourceRound: number;
  sourceTitle: string;
  text: string;
  health?: number;
  supplies?: number;
  stress?: number;
  money?: number;
  fatal?: boolean;
  addPassenger?: Passenger;
  removePassengerId?: string;
  addFlag?: string;
  condition?: ConsequenceCondition;
};

export type GameState = {
  playerName: string;
  sessionCode: string;
  mode: "SHORT" | "CLASSIC";
  seed: string;
  round: number;
  maxRounds: number;
  station: string;
  district: string;
  platform: string;
  clock: string;
  weather: string;
  trainLine: string;
  trainNumber: number;
  health: number;
  supplies: number;
  stress: number;
  money: number;
  passengers: Passenger[];
  pending: ScheduledConsequence[];
  history: string[];
  flags: string[];
  seenEvents: string[];
  score: number;
  trainChanges: number;
  decisions: number;
  status: "playing" | "dead" | "won";
};

export type ChoiceEffect = {
  health?: number;
  supplies?: number;
  stress?: number;
  money?: number;
  addPassenger?: Passenger;
  removePassengerId?: string;
  addFlag?: string;
  removeFlag?: string;
  switchTrain?: boolean;
  schedule?: Omit<ScheduledConsequence, "id" | "dueRound" | "sourceRound" | "sourceTitle"> & { delay: number };
};

export type Choice = {
  id: string;
  label: string;
  subtext: string;
  tone: Tone;
  immediateText: string;
  visualCue: VisualCue;
  effect: ChoiceEffect;
};

export type GameEvent = {
  id: string;
  tag: string;
  title: string;
  body: string;
  location: string;
  stationNote: string;
  choices: Choice[];
};

export type TurnResult = {
  immediateState: GameState;
  advancedState: GameState;
  immediateText: string;
  resolved: ScheduledConsequence[];
};
