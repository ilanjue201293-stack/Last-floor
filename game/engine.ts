import type {
  Choice,
  GameEvent,
  GameState,
  Passenger,
  ScheduledConsequence,
} from "./types";

const STATIONS = [
  ["MERCURE", "QUARTIER NORD"],
  ["VALOIS", "CENTRE"],
  ["RIVIÈRE", "RIVE EST"],
  ["MONTFER", "ZONE INDUSTRIELLE"],
  ["AURORA", "QUARTIER SUD"],
  ["LUMEN", "CENTRE-VILLE"],
  ["ORBITAL", "GRAND ÉCHANGEUR"],
  ["BELLEVUE", "HAUTS"],
  ["VERNIER", "VIEILLE VILLE"],
  ["CENDRE", "ZONE OUEST"],
  ["LUCIOLE", "QUARTIER LAC"],
  ["HALO", "NŒUD CENTRAL"],
] as const;

const WEATHER = ["PLUIE FINE", "BROUILLARD", "VENT FROID", "NUIT CLAIRE", "ORAGE AU LOIN"];
const LINES = ["N-04", "C-11", "METRO-X", "R-27"];

export const STARTING_PASSENGERS: Passenger[] = [
  { id: "p1", name: "MILO", age: 29, note: "casque audio · regarde le sol", trust: 50, accent: "blue" },
  { id: "p2", name: "NORA", age: 47, note: "sac rouge · observe les portes", trust: 50, accent: "red" },
  { id: "p3", name: "ELI", age: 19, note: "uniforme de travail · très fatigué", trust: 50, accent: "violet" },
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function random(seed: string) {
  let x = hash(seed) || 1;
  return () => {
    x += 0x6d2b79f5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeInitialState(seed = String(Date.now())): GameState {
  const r = random(seed);
  const station = STATIONS[Math.floor(r() * STATIONS.length)] ?? STATIONS[0];
  return {
    round: 1,
    totalRounds: 30,
    station: station[0],
    district: station[1],
    clock: "22:41",
    weather: WEATHER[Math.floor(r() * WEATHER.length)] ?? WEATHER[0],
    trainLine: LINES[Math.floor(r() * LINES.length)] ?? LINES[0],
    trainNo: 1 + Math.floor(r() * 900),
    health: 100,
    supplies: 74,
    stress: 18,
    money: 35,
    passengers: STARTING_PASSENGERS,
    pending: [],
    history: ["Tu montes dans le train. Ton terminus est MAISON."],
    flags: [],
    score: 0,
    trainChanges: 0,
    decisions: 0,
    bestRound: 1,
    status: "playing",
  };
}

function person(seed: string, index: number): Passenger {
  const r = random(seed);
  const names = ["INES", "SACHA", "TOM", "YUNA", "LÉO", "MAYA", "NOAM", "JADE"];
  const notes = ["porte une valise", "ne parle à personne", "a l'air pressé", "tient un bouquet", "regarde sa montre", "semble perdu"];
  return {
    id: `new-${seed}-${index}`,
    name: names[Math.floor(r() * names.length)] ?? "SAM",
    age: 18 + Math.floor(r() * 50),
    note: notes[Math.floor(r() * notes.length)] ?? notes[0],
    trust: 50,
    accent: ["red", "blue", "amber", "violet"][index % 4] as Passenger["accent"],
  };
}

function locationForRound(round: number, seed: string) {
  const r = random(seed + ":loc");
  const station = STATIONS[(round - 1) % STATIONS.length] ?? STATIONS[0];
  const weather = WEATHER[Math.floor(r() * WEATHER.length)] ?? WEATHER[0];
  const minutes = (41 + round * 7) % 60;
  const hour = 22 + Math.floor((round * 7) / 60);
  return {
    station: station[0],
    district: station[1],
    weather,
    clock: `${String(hour % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

function addSchedule(
  state: GameState,
  sourceTitle: string,
  schedule: NonNullable<Choice["effect"]["schedule"]>,
) {
  const entry: ScheduledConsequence = {
    id: `${state.round}-${sourceTitle}-${state.pending.length}`,
    dueRound: state.round + schedule.delay,
    sourceRound: state.round,
    sourceTitle,
    text: schedule.text,
    health: schedule.health,
    supplies: schedule.supplies,
    stress: schedule.stress,
    money: schedule.money,
    fatal: schedule.fatal,
  };
  return [...state.pending, entry];
}

export function applyChoice(state: GameState, event: GameEvent, choice: Choice): GameState {
  let next = { ...state, pending: [...state.pending], passengers: [...state.passengers], flags: [...state.flags], history: [...state.history] };
  const effect = choice.effect;
  next.health += effect.health ?? 0;
  next.supplies += effect.supplies ?? 0;
  next.stress += effect.stress ?? 0;
  next.money += effect.money ?? 0;
  next.score += 75 + Math.max(0, next.health - state.health) * 2;
  next.decisions += 1;
  next.history.unshift(`${event.title} → ${choice.label}`);
  if (effect.addPassenger) next.passengers.push(effect.addPassenger);
  if (effect.removePassengerId) next.passengers = next.passengers.filter((p) => p.id !== effect.removePassengerId);
  if (effect.flag && !next.flags.includes(effect.flag)) next.flags.push(effect.flag);
  if (effect.schedule) next.pending = addSchedule(next, event.title, effect.schedule);
  if (effect.switchTrain) {
    next.trainNo += 1;
    next.trainChanges += 1;
    next.trainLine = LINES[(LINES.indexOf(next.trainLine) + 1) % LINES.length] ?? LINES[0];
    next.stress = Math.max(0, next.stress - 8);
    next.history.unshift("Tu changes de train. Nouvelle rame, même destination.");
  }
  return next;
}

export function advanceRound(state: GameState): { state: GameState; death?: ScheduledConsequence; resolved: ScheduledConsequence[] } {
  const nextRound = state.round + 1;
  let next = { ...state, round: nextRound, pending: [...state.pending], history: [...state.history], bestRound: Math.max(state.bestRound, nextRound) };
  const resolved = next.pending.filter((item) => item.dueRound <= nextRound);
  next.pending = next.pending.filter((item) => item.dueRound > nextRound);

  for (const item of resolved) {
    next.health += item.health ?? 0;
    next.supplies += item.supplies ?? 0;
    next.stress += item.stress ?? 0;
    next.money += item.money ?? 0;
    next.history.unshift(item.text);
  }

  if (next.supplies <= 0) {
    next.health -= 12;
    next.history.unshift("Tes réserves sont vides. Tu t'affaiblis.");
  }
  if (next.stress >= 100) {
    next.health -= 10;
    next.stress = 84;
    next.history.unshift("Le stress devient physique. Tu vacilles.");
  }

  next.health = Math.max(0, Math.min(100, next.health));
  next.supplies = Math.max(0, Math.min(100, next.supplies));
  next.stress = Math.max(0, Math.min(100, next.stress));
  next.score += Math.max(10, next.health) + Math.max(5, next.supplies);

  const location = locationForRound(nextRound, `round-${nextRound}`);
  next.station = location.station;
  next.district = location.district;
  next.weather = location.weather;
  next.clock = location.clock;

  const death = resolved.find((item) => item.fatal) ?? (next.health <= 0 ? resolved[resolved.length - 1] : undefined);
  if (next.health <= 0 || death) {
    next.status = "dead";
    return { state: next, death, resolved };
  }

  if (nextRound >= next.totalRounds) {
    next.status = "won";
  }

  return { state: next, resolved };
}

function choice(id: string, label: string, text: string, tone: Choice["tone"], effect: Choice["effect"]): Choice {
  return { id, label, text, tone, effect };
}

function event(seed: string, id: string, tag: string, title: string, body: string, location: string, choices: Choice[]): GameEvent {
  return { id: `${id}-${seed}`, tag, title, body, location, choices };
}

export function makeEvent(state: GameState): GameEvent {
  const r = random(`${state.round}:${state.station}:${state.trainNo}`);
  const variants: GameEvent[] = [];
  variants.push(
    event(String(state.round), "stranger", "PASSAGER", "Un homme veut monter", "Il tient une carte froissée et répète qu'il doit absolument arriver avant minuit.", "Quai 2", [
      choice("let-in", "LE LAISSER MONTER", "Tu ouvres les portes.", "neutral", {
        addPassenger: person(String(state.round), state.round),
        schedule: { delay: 3, text: "Le nouvel arrivant a semé la panique dans le wagon. Quelque chose a été déplacé.", stress: 24, supplies: -12, fatal: false },
      }),
      choice("question", "LUI POSER DES QUESTIONS", "Tu prends trente secondes pour comprendre.", "safe", {
        stress: 7,
        schedule: { delay: 2, text: "Tu comprends plus tard qu'une information qu'il t'a donnée était fausse. Aucun dégât direct, mais le doute reste.", stress: 12 },
      }),
      choice("descend", "DESCENDRE POUR LE SUIVRE", "Tu quittes la rame avec lui. Une autre rame peut encore arriver.", "weird", {
        switchTrain: true,
        schedule: { delay: 2, text: "La rame que tu as quittée est restée bloquée plusieurs stations plus loin.", stress: -14, money: 8 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "warning", "MESSAGE", "Quelqu'un te prévient", "Une vieille dame te glisse : « Ne restez pas dans cette rame après la prochaine station. »", "Porte arrière", [
      choice("trust", "LA CROIRE", "Tu prépares ton changement de train.", "safe", {
        switchTrain: true,
        schedule: { delay: 2, text: "Le signal d'alerte de l'ancienne rame se déclenche. Tu n'y es plus.", stress: -18, money: 6 },
      }),
      choice("ignore", "IGNORER", "Ça ressemble à une histoire de plus.", "risky", {
        stress: -4,
        schedule: { delay: 2, text: "Un arrêt technique imprévu bloque le wagon. Tu perds des réserves à attendre.", supplies: -28, stress: 22 },
      }),
      choice("ask", "LUI DEMANDER POURQUOI", "Tu essaies d'obtenir un détail concret.", "neutral", {
        stress: 10,
        schedule: { delay: 3, text: "La vieille dame avait raison sur un point : le quai suivant était fermé.", stress: 8, supplies: -8 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "smoke", "INCIDENT", "Une odeur de gaz", "Une odeur métallique apparaît. Personne autour de toi ne semble réagir.", "Entre deux wagons", [
      choice("stay", "RESTER", "Tu attends de voir si ça disparaît.", "danger", {
        stress: 8,
        schedule: { delay: 2, text: "La fuite que tu avais ignorée atteint le wagon. Tu suffoques.", health: -42, stress: 30 },
      }),
      choice("descend", "DESCENDRE", "Tu quittes la rame au prochain arrêt.", "safe", {
        switchTrain: true,
        schedule: { delay: 2, text: "Les agents ont évacué la rame que tu as quittée.", stress: -22 },
      }),
      choice("alert", "PRÉVENIR TOUT LE MONDE", "Tu déclenches l'alarme.", "neutral", {
        stress: 20,
        schedule: { delay: 1, text: "L'alarme a vidé une partie de tes provisions pendant l'évacuation.", supplies: -18, money: -5 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "package", "OBJET", "Une valise sans propriétaire", "Personne ne veut reconnaître la valise posée sous un siège. Le train redémarre déjà.", "Voiture 1", [
      choice("open", "L'OUVRIR", "Tu veux savoir ce qu'il y a dedans.", "risky", {
        money: 20,
        schedule: { delay: 2, text: "Le contenu t'attire des ennuis : quelqu'un revient le réclamer.", stress: 25, health: -10 },
      }),
      choice("move", "LA METTRE DE CÔTÉ", "Tu éloignes la valise de la zone de passage.", "neutral", {
        supplies: -5,
        schedule: { delay: 1, text: "La valise n'était pas dangereuse. Elle a simplement déclenché une fouille.", stress: 12 },
      }),
      choice("leave", "NE RIEN FAIRE", "Tu la laisses là où elle est.", "safe", {
        schedule: { delay: 3, text: "La valise disparaît pendant un arrêt. Personne ne t'accuse.", money: 5 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "child", "PASSAGER", "Un enfant cherche sa mère", "Il te demande si tu as vu une femme avec un manteau jaune. La foule descend.", "Hall de correspondance", [
      choice("help", "L'AIDER", "Tu descends avec lui.", "safe", {
        switchTrain: true,
        stress: 12,
        schedule: { delay: 2, text: "La mère était dans une autre rame. Le petit te laisse un badge porte-bonheur.", money: 22, stress: -20 },
      }),
      choice("stay", "RESTER DANS LE TRAIN", "Tu lui indiques simplement la sortie.", "neutral", {
        stress: 4,
        schedule: { delay: 3, text: "Tu repenses à l'enfant quand le train repart. Rien n'indique ce qui lui est arrivé.", stress: 10 },
      }),
      choice("call", "APPELER UN AGENT", "Tu passes le relais à quelqu'un de la station.", "safe", {
        money: -3,
        schedule: { delay: 2, text: "L'agent a retrouvé la mère. Ta décision n'aura pas de conséquence.", stress: -6 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "power", "VILLE", "Toute la station s'éteint", "L'écran des quais devient noir. Une seconde plus tard, les lumières de la ville aussi.", "Station centrale", [
      choice("wait", "ATTENDRE", "Tu laisses le système redémarrer.", "neutral", {
        supplies: -14,
        stress: 15,
        schedule: { delay: 3, text: "La panne a coupé la ventilation de ton wagon plus longtemps que prévu.", health: -20, stress: 16 },
      }),
      choice("transfer", "CHANGER DE TRAIN", "Une rame de secours vient d'arriver.", "safe", {
        switchTrain: true,
        money: -8,
        schedule: { delay: 2, text: "Le train de secours repart normalement.", stress: -14 },
      }),
      choice("follow", "SUIVRE LES GENS", "Tu quittes le quai principal avec la foule.", "weird", {
        stress: 6,
        schedule: { delay: 2, text: "Le chemin de secours était fermé. Tu as raté une correspondance.", supplies: -18, money: -10 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "police", "CONTRÔLE", "Des agents montent", "Ils demandent à chaque passager de montrer quelque chose prouvant son identité.", "Voiture 2", [
      choice("cooperate", "COOPÉRER", "Tu restes calme et aides à organiser le contrôle.", "safe", {
        stress: -8,
        schedule: { delay: 2, text: "Le contrôle se termine. Tu récupères un peu de confiance.", money: 12, stress: -10 },
      }),
      choice("hide", "TE CACHER", "Tu ne veux aucune question.", "risky", {
        stress: 22,
        schedule: { delay: 2, text: "Les agents te retrouvent au mauvais moment. Tu dois abandonner quelques provisions.", supplies: -22, money: -15 },
      }),
      choice("descend", "DESCENDRE", "Tu prends la sortie avant qu'ils arrivent.", "neutral", {
        switchTrain: true,
        schedule: { delay: 1, text: "La rame suivante évite le contrôle.", stress: 4 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "rain", "QUAI", "Le quai est inondé", "L'eau monte autour des chaussures. Le prochain train est annoncé dans trois minutes.", "Sous-sol", [
      choice("jump", "TRAVERSER", "Tu avances malgré l'eau.", "danger", {
        health: -8,
        stress: 16,
        schedule: { delay: 2, text: "Tes vêtements humides te rendent malade pendant le trajet.", health: -22, supplies: -6 },
      }),
      choice("back", "REMONTER", "Tu rejoins la rue.", "safe", {
        switchTrain: true,
        money: -6,
        schedule: { delay: 2, text: "Le détour t'a coûté mais tu évites l'inondation.", stress: -12 },
      }),
      choice("wait", "ATTENDRE", "Tu restes sous l'auvent.", "neutral", {
        supplies: -10,
        schedule: { delay: 1, text: "Le niveau baisse. Tu reprends le trajet avec un peu de retard.", stress: 10 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "quiet", "NORMAL", "Une station étrangement calme", "Aucun bruit. Aucun écran. Juste un quai vide et une porte ouverte.", "Terminus secondaire", [
      choice("stay", "RESTER", "Tu gardes ta place.", "safe", {
        stress: -8,
        schedule: { delay: 2, text: "Le calme n'était qu'un retard d'affichage.", supplies: 8 },
      }),
      choice("explore", "DESCENDRE ET REGARDER", "Tu vas voir ce qu'il y a derrière la porte.", "weird", {
        switchTrain: true,
        stress: 8,
        schedule: { delay: 2, text: "Tu trouves un raccourci et remontes dans une autre rame.", money: 18, stress: -4 },
      }),
      choice("leave", "NE PAS TOUCHER", "Tu refuses de t'en mêler.", "neutral", {
        schedule: { delay: 3, text: "Une porte secondaire s'est finalement refermée. Tu as évité quelque chose que tu ne comprends pas.", stress: 5 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "medic", "PASSAGER", "Quelqu'un s'effondre", "Une personne près de la porte tombe. Les autres regardent sans bouger.", "Voiture 3", [
      choice("help", "L'AIDER", "Tu utilises une partie de tes réserves pour l'assister.", "safe", {
        supplies: -18,
        stress: 9,
        schedule: { delay: 2, text: "La personne se rétablit. Elle te laisse un peu d'argent avant de descendre.", money: 28, stress: -12 },
      }),
      choice("call", "APPELER LES SECOURS", "Tu gardes tes distances.", "safe", {
        money: -4,
        schedule: { delay: 1, text: "Les secours prennent le relais. Le train repart après une longue pause.", supplies: -10, stress: -4 },
      }),
      choice("ignore", "NE RIEN FAIRE", "Tu laisses quelqu'un d'autre décider.", "danger", {
        stress: 18,
        schedule: { delay: 3, text: "La situation empire parce que personne n'a agi.", health: -28, stress: 22 },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "signal", "VOIE", "Le signal devient rouge", "Le conducteur n'accélère plus. La radio répète le même mot : « Attendre. »", "Entre deux stations", [
      choice("stay", "ATTENDRE", "Tu ne prends aucun risque.", "safe", {
        supplies: -8,
        schedule: { delay: 2, text: "La voie est libérée. Le retard est le seul prix à payer.", stress: 5 },
      }),
      choice("transfer", "DESCENDRE ET CHANGER", "Une porte latérale vient de s'ouvrir.", "weird", {
        switchTrain: true,
        schedule: { delay: 3, text: "Le détour t'éloigne mais évite une fermeture complète de ligne.", money: -12, stress: -10 },
      }),
      choice("force", "FORCER LA SUITE", "Tu pousses pour que le train reparte.", "danger", {
        stress: 20,
        schedule: { delay: 2, text: "La voie suivante était occupée. Le choc abîme la rame.", health: -35, fatal: true },
      }),
    ]),
  );

  variants.push(
    event(String(state.round), "final", "TERMINUS", "La maison approche", "L'annonce audio grésille : « Derniers arrêts avant le terminus MAISON. »", "Ligne principale", [
      choice("stay", "RESTER", "Tu gardes ton calme jusqu'au bout.", "safe", {
        stress: -15,
        supplies: -6,
        schedule: { delay: 1, text: "Les portes de MAISON s'ouvrent. Tu es enfin arrivé.", stress: -20 },
      }),
      choice("descend", "DESCENDRE AVANT LE TERMINUS", "Une dernière occasion de changer de rame.", "weird", {
        switchTrain: true,
        schedule: { delay: 2, text: "Tu rates ton premier terminus mais une correspondance te ramène sur la bonne ligne.", money: -5, stress: 10 },
      }),
      choice("help", "AIDER UN PASSAGER À DESCENDRE", "Tu prends le temps malgré l'annonce.", "neutral", {
        stress: -6,
        schedule: { delay: 1, text: "Le passager te remercie. Tu atteins le terminus avec quelques minutes de retard.", money: 15 },
      }),
    ]),
  );

  let index = Math.floor(r() * variants.length);
  if (state.round === state.totalRounds - 1) index = variants.length - 1;
  if (state.round % 6 === 0) index = 2;
  const selected = variants[index] ?? variants[0];
  return selected;
}

export function displayPending(state: GameState) {
  return [...state.pending].sort((a, b) => a.dueRound - b.dueRound).slice(0, 3);
}
