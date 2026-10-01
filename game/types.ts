export type Tone = "safe" | "danger" | "neutral" | "weird";

export type ScheduledConsequence = {
  id: string;
  dueRound: number;
  sourceRound: number;
  sourceTitle: string;
  text: string;
  health?: number;
  supplies?: number;
  stress?: number;
  money?: number;
  fatal?: boolean;
};

export type Passenger = {
  id: string;
  name: string;
  age: number;
  note: string;
  trust: number;
  accent: "red" | "blue" | "amber" | "violet";
};

export type GameState = {
  round: number;
  totalRounds: number;
  station: string;
  district: string;
  clock: string;
  weather: string;
  trainLine: string;
  trainNo: number;
  health: number;
  supplies: number;
  stress: number;
  money: number;
  passengers: Passenger[];
  pending: ScheduledConsequence[];
  history: string[];
  flags: string[];
  score: number;
  trainChanges: number;
  decisions: number;
  bestRound: number;
  status: "playing" | "dead" | "won";
};

export type ChoiceEffect = {
  health?: number;
  supplies?: number;
  stress?: number;
  money?: number;
  addPassenger?: Passenger;
  removePassengerId?: string;
  schedule?: Omit<ScheduledConsequence, "id" | "sourceRound" | "sourceTitle"> & { delay: number };
  flag?: string;
  switchTrain?: boolean;
};

export type Choice = {
  id: string;
  label: string;
  text: string;
  tone: Tone;
  effect: ChoiceEffect;
};

export type GameEvent = {
  id: string;
  tag: string;
  title: string;
  body: string;
  location: string;
  urgency?: "low" | "medium" | "high";
  choices: Choice[];
};
