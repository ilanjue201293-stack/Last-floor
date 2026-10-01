import type {
  Choice,
  GameEvent,
  GameState,
  Passenger,
  ScheduledConsequence
} from "./types";

const STATIONS = [
  ["MERCURE", "QUARTIER NORD"],
  ["VALOIS", "CENTRE"],
  ["RIVIÈRE", "RIVE EST"],
  ["MONTFER", "ZONE INDUSTRIELLE"],
  ["AURORA", "QUARTIER SUD"],
  ["LUMEN", "CENTRE-VILLE"],
  ["ORBITAL", "GRAND ÉCHANGEUR"],
  ["BELLEVUE", "LES HAUTS"],
  ["VERNIER", "VIEILLE VILLE"],
  ["CENDRE", "ZONE OUEST"],
  ["LUCIOLE", "QUARTIER LAC"],
  ["HALO", "NŒUD CENTRAL"]
] as const;

const WEATHER = ["PLUIE FINE", "BROUILLARD", "VENT FROID", "NUIT CLAIRE", "ORAGE AU LOIN"];
const LINES = ["N-04", "C-11", "R-27", "M-X"];

export const STARTING_PASSENGERS: Passenger[] = [
  { id: "milo", name: "MILO", age: 29, note: "casque audio · évite les regards", accent: "blue" },
  { id: "nora", name: "NORA", age: 47, note: "sac rouge · regarde souvent les portes", accent: "red" }
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let x = hash(seed) || 1;
  return function next() {
    x += 0x6d2b79f5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function locationFor(round: number, seed: string) {
  const r = rng(seed + ":station:" + round);
  const station = STATIONS[(round - 1) % STATIONS.length] ?? STATIONS[0];
  return {
    station: station[0],
    district: station[1],
    platform: String(1 + Math.floor(r() * 6)).padStart(2, "0"),
    clock: String((22 + Math.floor((round * 9) / 60)) % 24).padStart(2, "0") + ":" + String((14 + round * 9) % 60).padStart(2, "0"),
    weather: WEATHER[Math.floor(r() * WEATHER.length)] ?? WEATHER[0]
  };
}

function newPassenger(seed: string, index: number, role?: Passenger["hiddenRole"]): Passenger {
  const r = rng(seed + ":passenger:" + index);
  const names = ["ADAM", "INES", "SACHA", "MAYA", "NOAM", "JADE", "TOM", "YUNA"];
  const notes = ["valise rigide", "regarde sa montre", "tient un sac en toile", "semble perdu", "ne quitte pas son téléphone", "a l'air épuisé"];
  return {
    id: "p-" + seed + "-" + index,
    name: names[Math.floor(r() * names.length)] ?? "SAM",
    age: 18 + Math.floor(r() * 52),
    note: notes[Math.floor(r() * notes.length)] ?? notes[0],
    accent: (["blue", "red", "amber", "violet", "green"][index % 5] ?? "blue") as Passenger["accent"],
    hiddenRole: role
  };
}

export function makeInitialState(
  seed: string,
  playerName: string,
  mode: "SHORT" | "CLASSIC",
  sessionCode: string
): GameState {
  const r = rng(seed);
  const loc = locationFor(1, seed);
  return {
    playerName,
    sessionCode,
    mode,
    seed,
    round: 1,
    maxRounds: mode === "SHORT" ? 12 : 24,
    station: loc.station,
    district: loc.district,
    platform: loc.platform,
    clock: loc.clock,
    weather: loc.weather,
    trainLine: LINES[Math.floor(r() * LINES.length)] ?? LINES[0],
    trainNumber: 100 + Math.floor(r() * 799),
    health: 100,
    supplies: 78,
    stress: 16,
    money: 42,
    passengers: STARTING_PASSENGERS,
    pending: [],
    history: ["Départ. Objectif : atteindre MAISON."],
    flags: [],
    seenEvents: [],
    score: 0,
    trainChanges: 0,
    decisions: 0,
    status: "playing"
  };
}

function schedule(
  state: GameState,
  event: GameEvent,
  effect: NonNullable<Choice["effect"]["schedule"]>
): ScheduledConsequence {
  return {
    id: state.round + ":" + event.id + ":" + effect.chainId,
    dueRound: state.round + effect.delay,
    chainId: effect.chainId,
    sourceRound: state.round,
    sourceTitle: event.title,
    text: effect.text,
    health: effect.health,
    supplies: effect.supplies,
    stress: effect.stress,
    money: effect.money,
    fatal: effect.fatal,
    addPassenger: effect.addPassenger,
    removePassengerId: effect.removePassengerId,
    addFlag: effect.addFlag,
    condition: effect.condition
  };
}

function copyState(state: GameState): GameState {
  return {
    ...state,
    passengers: state.passengers.map(function clonePassenger(p) { return { ...p }; }),
    pending: state.pending.map(function clonePending(p) { return { ...p, condition: p.condition ? { ...p.condition } : undefined }; }),
    history: state.history.slice(),
    flags: state.flags.slice(),
    seenEvents: state.seenEvents.slice()
  };
}

export function applyChoice(state: GameState, event: GameEvent, choice: Choice): { state: GameState; immediateText: string } {
  const next = copyState(state);
  const effect = choice.effect;

  next.health += effect.health ?? 0;
  next.supplies += effect.supplies ?? 0;
  next.stress += effect.stress ?? 0;
  next.money += effect.money ?? 0;
  next.score += 80 + Math.max(0, effect.money ?? 0) * 2;
  next.decisions += 1;
  if (!next.seenEvents.includes(event.id)) next.seenEvents.push(event.id);

  if (effect.addPassenger) next.passengers.push(effect.addPassenger);
  if (effect.removePassengerId) {
    next.passengers = next.passengers.filter(function keepPassenger(p) {
      return p.id !== effect.removePassengerId;
    });
  }

  if (effect.addFlag && !next.flags.includes(effect.addFlag)) next.flags.push(effect.addFlag);
  if (effect.removeFlag) next.flags = next.flags.filter(function keepFlag(flag) { return flag !== effect.removeFlag; });

  if (effect.schedule) {
    next.pending.push(schedule(next, event, effect.schedule));
  }

  if (effect.switchTrain) {
    const currentIndex = Math.max(0, LINES.indexOf(next.trainLine));
    next.trainLine = LINES[(currentIndex + 1) % LINES.length] ?? LINES[0];
    next.trainNumber = 100 + hash(next.seed + ":train:" + next.round + ":" + next.trainChanges) % 799;
    next.trainChanges += 1;
    next.stress = Math.max(0, next.stress - 7);
    next.history.unshift("Tu quittes la rame et montes dans un autre train.");
  }

  next.health = Math.max(0, Math.min(100, next.health));
  next.supplies = Math.max(0, Math.min(100, next.supplies));
  next.stress = Math.max(0, Math.min(100, next.stress));

  next.history.unshift(event.title + " → " + choice.label);
  return { state: next, immediateText: choice.immediateText };
}

function consequenceBlocked(state: GameState, item: ScheduledConsequence) {
  const condition = item.condition;
  if (!condition) return false;
  if (condition.blockedFlag && state.flags.includes(condition.blockedFlag)) return true;
  if (condition.requiredFlag && !state.flags.includes(condition.requiredFlag)) return true;
  if (condition.passengerId && !state.passengers.some(function find(p) { return p.id === condition.passengerId; })) return true;
  return false;
}

function applyConsequence(state: GameState, item: ScheduledConsequence) {
  if (consequenceBlocked(state, item)) return { state, applied: false };

  state.health += item.health ?? 0;
  state.supplies += item.supplies ?? 0;
  state.stress += item.stress ?? 0;
  state.money += item.money ?? 0;
  if (item.addPassenger) state.passengers.push(item.addPassenger);
  if (item.removePassengerId) {
    state.passengers = state.passengers.filter(function keep(p) { return p.id !== item.removePassengerId; });
  }
  if (item.addFlag && !state.flags.includes(item.addFlag)) state.flags.push(item.addFlag);
  state.history.unshift(item.text);
  return { state, applied: true };
}

export function advanceAfterNarration(state: GameState): { state: GameState; resolved: ScheduledConsequence[] } {
  const next = copyState(state);
  const nextRound = state.round + 1;
  next.round = nextRound;

  if (nextRound > next.maxRounds) {
    next.status = "won";
    next.station = "MAISON";
    next.district = "CHEZ TOI";
    next.platform = "00";
    next.clock = "00:00";
    next.weather = "NUIT CALME";
    next.score += 700;
    return { state: next, resolved: [] };
  }

  const loc = locationFor(nextRound, next.seed);
  next.station = loc.station;
  next.district = loc.district;
  next.platform = loc.platform;
  next.clock = loc.clock;
  next.weather = loc.weather;
  next.score += Math.max(15, next.health) + Math.max(8, next.supplies);

  const due = next.pending.filter(function dueNow(item) { return item.dueRound <= nextRound; });
  next.pending = next.pending.filter(function keep(item) { return item.dueRound > nextRound; });

  const resolved: ScheduledConsequence[] = [];
  for (const item of due) {
    const result = applyConsequence(next, item);
    if (result.applied) resolved.push(item);
  }

  next.health = Math.max(0, Math.min(100, next.health));
  next.supplies = Math.max(0, Math.min(100, next.supplies));
  next.stress = Math.max(0, Math.min(100, next.stress));

  if (next.supplies <= 0) {
    next.health = Math.max(0, next.health - 10);
    next.stress = Math.min(100, next.stress + 8);
  }
  if (next.stress >= 100) {
    next.health = Math.max(0, next.health - 12);
    next.stress = 82;
  }

  if (resolved.some(function fatal(item) { return item.fatal; }) || next.health <= 0) {
    next.status = "dead";
  }

  return { state: next, resolved };
}

function choice(
  id: string,
  label: string,
  subtext: string,
  tone: Choice["tone"],
  immediateText: string,
  visualCue: Choice["visualCue"],
  effect: Choice["effect"]
): Choice {
  return { id, label, subtext, tone, immediateText, visualCue, effect };
}

function event(id: string, tag: string, title: string, body: string, location: string, stationNote: string, choices: Choice[]): GameEvent {
  return { id, tag, title, body, location, stationNote, choices };
}

function suspiciousPassenger(state: GameState) {
  return state.passengers.find(function find(p) { return p.hiddenRole === "suspicious"; });
}

function childPassenger(state: GameState) {
  return state.passengers.find(function find(p) { return p.hiddenRole === "child"; });
}

export function makeEvent(state: GameState): GameEvent {
  const suspicious = suspiciousPassenger(state);
  const child = childPassenger(state);

  if (state.round === 1 && !state.seenEvents.includes("stranger")) {
    const adam = newPassenger(state.seed, 9, "suspicious");
    return event(
      "stranger",
      "PASSAGER",
      "Un homme veut monter",
      "Les portes bipent déjà. Un homme court sur le quai avec un sac sombre et te fait signe. Le conducteur attend encore quelques secondes.",
      "QUAI " + state.platform,
      "Tout le monde semble vouloir partir vite.",
      [
        choice(
          "board",
          "LE LAISSER MONTER",
          "Tu lui ouvres la porte.",
          "risky",
          "Les portes se rouvrent. L'homme monte, pose son sac contre la paroi et prend place dans la voiture 3. Le train repart.",
          "board",
          { addPassenger: adam, schedule: { delay: 3, chainId: "stranger-attack", text: "ADAM se lève brusquement. Le verrou d'une porte claque. Tu comprends trop tard que quelque chose n'allait pas depuis son arrivée.", health: -100, fatal: true, condition: { passengerId: adam.id, blockedFlag: "man-reported" } } }
        ),
        choice(
          "check",
          "VÉRIFIER SON BILLET",
          "Tu lui demandes où il va avant de décider.",
          "neutral",
          "Il te montre son billet. La destination correspond, mais la date est légèrement passée. Malgré tout, il monte. Il garde les yeux baissés.",
          "board",
          { addPassenger: adam, stress: 4, addFlag: "man-questioned", schedule: { delay: 3, chainId: "stranger-attack", text: "ADAM se lève brusquement. Le verrou d'une porte claque. Tu comprends trop tard que quelque chose n'allait pas depuis son arrivée.", health: -100, fatal: true, condition: { passengerId: adam.id, blockedFlag: "man-reported" } } }
        ),
        choice(
          "refuse",
          "REFUSER",
          "Tu gardes la porte fermée.",
          "safe",
          "Le signal retentit. L'homme reste sur le quai pendant que la rame s'éloigne.",
          "none",
          { stress: 5 }
        )
      ]
    );
  }

  if (suspicious && !state.flags.includes("man-checked")) {
    return event(
      "ticket-control",
      "CONTRÔLE",
      "Le contrôleur arrive",
      "Un contrôleur avance dans le couloir. Lorsqu'il arrive devant " + suspicious.name + ", l'homme détourne les yeux.",
      "VOITURE 3",
      "Le wagon vient de ralentir avant la station.",
      [
        choice(
          "report",
          "LE SIGNALER",
          "Tu lui montres discrètement le billet.",
          "safe",
          "Le contrôleur compare le billet avec son terminal. Deux agents attendent à la prochaine station. " + suspicious.name + " descend avant même qu'ils lui parlent.",
          "switch",
          { removePassengerId: suspicious.id, addFlag: "man-reported" }
        ),
        choice(
          "ignore",
          "NE RIEN DIRE",
          "Tu fais comme si tu n'avais rien remarqué.",
          "risky",
          "Le contrôleur passe sans poser de question. " + suspicious.name + " te regarde une seconde, puis range son billet.",
          "none",
          { addFlag: "man-checked", stress: -3 }
        ),
        choice(
          "talk",
          "LUI PARLER SEUL À SEUL",
          "Tu lui demandes ce qu'il cache.",
          "danger",
          "Il te suit dans l'espace entre les voitures. Sa réponse est calme, mais son regard change quand tu prononces le mot « billet ».",
          "warn",
          { addFlag: "man-checked", stress: 12, schedule: { delay: 1, chainId: "stranger-pressure", text: "La situation dégénère dans le passage entre les voitures. Tu te fais violemment bousculer avant qu'il ne retourne dans son siège.", health: -38, condition: { passengerId: suspicious.id, blockedFlag: "man-reported" } } }
        )
      ]
    );
  }

  if (state.flags.includes("bag-open") && !state.flags.includes("bag-resolved")) {
    return event(
      "bag-owner",
      "RETOUR",
      "Le propriétaire de la valise revient",
      "Un homme monte à la station suivante et regarde immédiatement sous les sièges. Il te demande si tu as vu une valise rigide noire.",
      "VOITURE 2",
      "La même valise que tout à l'heure n'est plus là.",
      [
        choice(
          "admit",
          "LUI DIRE LA VÉRITÉ",
          "Tu lui racontes exactement ce que tu as fait.",
          "safe",
          "Il vérifie le contenu, souffle de soulagement et récupère sa valise. Il te laisse quelques billets avant de descendre.",
          "none",
          { money: 28, addFlag: "bag-resolved" }
        ),
        choice(
          "lie",
          "MENTIR",
          "Tu dis n'avoir rien vu.",
          "risky",
          "Il insiste. Tu maintiens ton histoire. Il finit par abandonner, mais tu sens son regard rester sur toi jusqu'au prochain arrêt.",
          "warn",
          { stress: 20, addFlag: "bag-resolved", schedule: { delay: 2, chainId: "bag-report", text: "Les images des caméras finissent par montrer la valise dans ton wagon. Un contrôle te fait perdre du temps et de l'argent.", money: -32, stress: 24 } }
        ),
        choice(
          "leave",
          "PARTIR AVANT LA FIN",
          "Tu changes de rame avant qu'il n'ait fini.",
          "risky",
          "Tu descends. Une autre rame arrive presque immédiatement et tu montes dedans avant qu'il ne puisse te retrouver.",
          "switch",
          { switchTrain: true, addFlag: "bag-resolved", stress: 4 }
        )
      ]
    );
  }

  if (child && !state.flags.includes("child-resolved")) {
    return event(
      "child-return",
      "RENCONTRE",
      "Une femme cherche son enfant",
      "Une femme arrive en courant sur le quai. Elle prononce le prénom de l'enfant que tu avais aidé et regarde chaque voiture.",
      "QUAI " + state.platform,
      "La rame va repartir dans quelques secondes.",
      [
        choice(
          "reunite",
          "LUI MONTRER OÙ IL EST",
          "Tu lui fais signe depuis la porte.",
          "safe",
          "Elle retrouve son enfant. Il descend de ta rame et elle te remercie avant que les portes se ferment.",
          "none",
          { removePassengerId: child.id, money: 24, addFlag: "child-resolved" }
        ),
        choice(
          "stay",
          "ATTENDRE QUELQUES SECONDES",
          "Tu bloques le départ juste assez longtemps.",
          "neutral",
          "Tu maintiens les portes ouvertes. La femme monte, prend son enfant et repart aussitôt. Le train redémarre avec un peu de retard.",
          "none",
          { removePassengerId: child.id, stress: -10, addFlag: "child-resolved" }
        ),
        choice(
          "leave",
          "NE PAS TE MÊLER DE ÇA",
          "Tu laisses l'agent de quai s'en occuper.",
          "risky",
          "Les portes se ferment. La femme reste sur le quai et le train repart. Tu ne sauras pas si elle l'a retrouvé.",
          "none",
          { addFlag: "child-resolved", stress: 14 }
        )
      ]
    );
  }

  if (state.round === 3 && !state.seenEvents.includes("bag")) {
    const bag = newPassenger(state.seed, 14);
    bag.name = "PROPRIÉTAIRE";
    bag.note = "cherche quelque chose dans le train";
    return event(
      "bag",
      "OBJET",
      "Une valise sous le siège",
      "Une valise noire est coincée sous un siège. Elle n'appartient à personne autour de toi. Le train vient de repartir.",
      "VOITURE 2",
      "Personne ne semble remarquer que tu l'as trouvée.",
      [
        choice(
          "open",
          "L'OUVRIR",
          "Tu veux savoir ce qu'il y a dedans.",
          "risky",
          "Tu ouvres la valise. Elle contient des documents et une grosse enveloppe d'argent. Tu refermes aussitôt, mais quelqu'un va probablement venir la chercher.",
          "warn",
          { money: 70, addFlag: "bag-open", score: 100 }
        ),
        choice(
          "driver",
          "LA REMETTRE AU CONDUCTEUR",
          "Tu ne touches à rien d'autre.",
          "safe",
          "Tu transportes la valise jusqu'à la cabine et la confies au conducteur. Il te remercie et la garde hors du wagon.",
          "none",
          { money: 12, addFlag: "bag-resolved" }
        ),
        choice(
          "ignore",
          "LA LAISSER LÀ",
          "Tu ne veux rien savoir.",
          "neutral",
          "Tu repousses la valise sous le siège. Le train continue. Quelqu'un d'autre finira peut-être par la voir.",
          "none",
          { stress: 2, addFlag: "bag-resolved" }
        )
      ]
    );
  }

  if (state.round === 4 && !state.seenEvents.includes("fire")) {
    return event(
      "fire",
      "VILLE",
      "Une rue prend feu",
      "À travers les vitres, tu vois une colonne de fumée noire monter derrière les immeubles. La station suivante est partiellement évacuée.",
      "LUMEN — SORTIE SUD",
      "Le conducteur annonce un retard indéterminé.",
      [
        choice(
          "stay",
          "RESTER DANS LA RAME",
          "Tu attends que la voie soit rouverte.",
          "risky",
          "Les portes restent fermées. La fumée devient plus dense autour de la station tandis que la rame attend.",
          "warn",
          { supplies: -8, schedule: { delay: 1, chainId: "station-smoke", text: "La ventilation a aspiré une partie de la fumée dans la rame. Tu tousses pendant plusieurs minutes.", health: -24, stress: 16 } }
        ),
        choice(
          "descend",
          "DESCENDRE",
          "Tu quittes la rame pour une correspondance.",
          "safe",
          "Tu descends avec les autres. Quatre minutes plus tard, une autre rame arrive sur une voie parallèle. Tu montes et le voyage continue.",
          "switch",
          { switchTrain: true, addFlag: "fire-avoided" }
        ),
        choice(
          "help",
          "AIDER SUR LE QUAI",
          "Tu sors pour guider les gens vers la rue.",
          "neutral",
          "Tu aides plusieurs personnes à sortir de la zone avant de remonter dans une rame de secours.",
          "switch",
          { switchTrain: true, health: -8, supplies: -10, money: 18, addFlag: "fire-helped" }
        )
      ]
    );
  }

  if (state.round === 5 && !state.seenEvents.includes("power")) {
    return event(
      "power",
      "PANNE",
      "Les lumières s'éteignent",
      "Tout devient noir pendant trois secondes. Quand les lumières de secours reviennent, le wagon est silencieux.",
      "CENTRE DE LA RAME",
      "Le système de ventilation redémarre lentement.",
      [
        choice(
          "wait",
          "ATTENDRE",
          "Tu ne bouges pas.",
          "neutral",
          "Tu restes assis. Les lumières principales reviennent et le train repart normalement.",
          "none",
          { supplies: -6, stress: 7 }
        ),
        choice(
          "transfer",
          "CHANGER DE TRAIN",
          "Tu profites de l'arrêt pour changer de rame.",
          "safe",
          "Tu descends avant le redémarrage complet. La rame voisine est déjà alimentée et part dans ta direction.",
          "switch",
          { switchTrain: true, money: -6, addFlag: "power-avoided" }
        ),
        choice(
          "force",
          "OUVRIR LA PORTE",
          "Tu veux sortir par tes propres moyens.",
          "danger",
          "La porte s'ouvre difficilement. Tu te retrouves sur le quai technique, puis tu remontes avant le départ. Le système a enregistré l'incident.",
          "impact",
          { health: -10, stress: 16, schedule: { delay: 2, chainId: "door-incident", text: "Une sécurité automatique se déclenche à cause de la porte forcée. La rame est immobilisée et ton intégrité chute pendant l'incident.", health: -48, stress: 20 } }
        )
      ]
    );
  }

  if (state.round === 6 && !state.seenEvents.includes("child")) {
    const childPassengerData = newPassenger(state.seed, 22, "child");
    childPassengerData.name = "LEA";
    childPassengerData.age = 9;
    childPassengerData.note = "sac à dos jaune · cherche sa mère";
    return event(
      "child",
      "PASSAGER",
      "Une enfant est seule",
      "Une petite fille monte dans la mauvaise rame et te demande si tu sais où est sa mère. Les portes vont se fermer.",
      "QUAI " + state.platform,
      "Les annonces sont couvertes par le bruit de la station.",
      [
        choice(
          "help",
          "L'AIDER",
          "Tu la fais monter et tu gardes un œil sur elle.",
          "safe",
          "Tu lui fais une place. Elle s'assoit près de la porte avec son sac jaune et te décrit sa mère.",
          "board",
          { addPassenger: childPassengerData, addFlag: "child-helped", stress: 8 }
        ),
        choice(
          "agent",
          "APPELER UN AGENT",
          "Tu la confies immédiatement à la station.",
          "safe",
          "Tu la remets à un agent sur le quai. Le train repart sans elle.",
          "none",
          { stress: 2 }
        ),
        choice(
          "ignore",
          "RESTER À TA PLACE",
          "Tu la laisses chercher quelqu'un d'autre.",
          "neutral",
          "Tu ne fais rien. Elle descend avant le départ pour attendre un adulte.",
          "none",
          { stress: 10 }
        )
      ]
    );
  }

  if (state.round === 7 && !state.seenEvents.includes("signal")) {
    return event(
      "signal",
      "VOIE",
      "Le signal passe au rouge",
      "Le train ralentit jusqu'à l'arrêt complet. Une voix dans la radio répète : « Ne repartez pas avant confirmation. »",
      "ENTRE " + state.station + " ET LE SUIVANT",
      "Le chauffeur attend une autorisation.",
      [
        choice(
          "wait",
          "ATTENDRE",
          "Tu fais confiance au signal.",
          "safe",
          "Tu attends. Après quelques minutes, l'autorisation arrive et le train repart doucement.",
          "none",
          { supplies: -5, stress: 3 }
        ),
        choice(
          "transfer",
          "DESCENDRE ET CHANGER",
          "Tu rejoins une autre rame qui vient d'arriver.",
          "neutral",
          "Tu quittes le train à l'arrêt et montes dans une autre rame. Elle suit une boucle parallèle.",
          "switch",
          { switchTrain: true, money: -4, addFlag: "signal-detour" }
        ),
        choice(
          "push",
          "FAIRE REPARTIR",
          "Tu suis les autres qui appuient sur le système de commande.",
          "danger",
          "Le système finit par repartir, mais le train donne un choc violent. Tout le monde comprend que ce n'était pas une bonne idée.",
          "impact",
          { health: -15, stress: 19, schedule: { delay: 2, chainId: "red-signal", text: "Le choc de la dernière fois a abîmé un système. La rame freine brutalement et tu es projeté contre une paroi.", health: -55, fatal: false } }
        )
      ]
    );
  }

  const generic: GameEvent[] = [
    event(
      "station-closed",
      "STATION",
      "Une station ferme soudainement",
      "Les barrières descendent avant ton arrivée. Les quais sont encore éclairés, mais personne ne peut y entrer.",
      "ACCÈS PRINCIPAL",
      "Une rame attend sur la voie d'à côté.",
      [
        choice("switch", "PRENDRE LA RAME D'À CÔTÉ", "Tu profites de l'occasion.", "safe", "Tu changes de train avant la fermeture complète. La nouvelle rame part quelques secondes après.", "switch", { switchTrain: true, money: -5 }),
        choice("wait", "ATTENDRE", "Tu restes à bord.", "neutral", "Tu attends que la station rouvre. Le retard coûte du temps, mais rien d'autre ne se passe.", "none", { stress: 6 }),
        choice("leave", "DESCENDRE QUAND MÊME", "Tu suis un agent vers une sortie secondaire.", "risky", "Tu quittes le train et rejoins la rame suivante par un passage de service.", "switch", { switchTrain: true, health: -4, stress: 5 })
      ]
    ),
    event(
      "water",
      "PASSAGER",
      "Quelqu'un demande de l'eau",
      "Une passagère se sent mal. Elle demande simplement une bouteille et promet de te rembourser.",
      "VOITURE 1",
      "Les autres passagers regardent ailleurs.",
      [
        choice("give", "LUI DONNER DE L'EAU", "Tu partages une de tes réserves.", "safe", "Tu lui donnes une bouteille. Sa respiration ralentit et elle te remercie.", "none", { supplies: -10, stress: -4, schedule: { delay: 2, chainId: "water-thanks", text: "Avant de descendre, la passagère te laisse une enveloppe avec de quoi remplacer ta bouteille.", money: 20 } }),
        choice("sell", "LUI VENDRE", "Tu demandes un peu d'argent.", "risky", "Elle accepte et boit lentement. Le wagon redevient calme.", "none", { supplies: -8, money: 12, stress: 3 }),
        choice("refuse", "REFUSER", "Tu gardes tes réserves.", "neutral", "Tu refuses. Elle se tourne vers une autre personne.", "none", { stress: 5 })
      ]
    ),
    event(
      "worker",
      "VILLE",
      "Un agent te fait signe",
      "Sur le quai, un agent de maintenance te demande si tu peux déposer un petit boîtier à la prochaine station.",
      "QUAI " + state.platform,
      "Il n'a pas le temps de monter.",
      [
        choice("carry", "LE PRENDRE", "Tu acceptes de l'aider.", "safe", "Tu prends le boîtier et le gardes avec toi. Il doit être livré au prochain arrêt.", "none", { addFlag: "carrying-box", schedule: { delay: 2, chainId: "worker-reward", text: "L'agent te retrouve à une station suivante. Le boîtier était important et il te remercie pour l'avoir apporté.", money: 32, supplies: -4, addFlag: "box-delivered" } }),
        choice("decline", "REFUSER", "Tu n'es pas sûr de vouloir transporter ça.", "neutral", "L'agent hausse les épaules et repart vers son local.", "none", { stress: 2 }),
        choice("ask", "DEMANDER POURQUOI", "Tu veux comprendre avant d'accepter.", "neutral", "Il t'explique que le boîtier sert à réparer un signal. Tu refuses finalement de le prendre.", "none", { stress: -2 })
      ]
    ),
    event(
      "quiet-car",
      "VOITURE 4",
      "La dernière voiture est vide",
      "Pour la première fois de la nuit, personne n'est dans la voiture 4. Une seule lumière clignote au-dessus d'un siège.",
      "VOITURE 4",
      "Le train roule normalement.",
      [
        choice("move", "Y ALLER", "Tu changes simplement de voiture.", "risky", "Tu t'installes dans la dernière voiture. Le voyant arrête de clignoter quelques secondes plus tard.", "none", { stress: 8 }),
        choice("stay", "RESTER ICI", "Tu ne changes pas de place.", "safe", "Tu restes avec les autres. La lumière de la dernière voiture s'éteint naturellement.", "none", { stress: -4 }),
        choice("switch", "CHANGER DE TRAIN", "Tu préfères ne pas tenter le hasard.", "neutral", "Tu descends et prends la rame suivante. Elle est plus remplie mais parfaitement normale.", "switch", { switchTrain: true, money: -4 })
      ]
    ),
    event(
      "last-stretch",
      "DERNIERS ARRÊTS",
      "MAISON n'est plus très loin",
      "Le haut-parleur grésille. Tu reconnais enfin la voix de l'annonceur qui indique la zone de ton domicile.",
      "LIGNE PRINCIPALE",
      "Le prochain trajet sera le dernier.",
      [
        choice("stay", "RESTER À BORD", "Tu ne prends plus de risque.", "safe", "Tu restes assis et regardes les lumières défiler. La ville se calme autour du train.", "none", { supplies: -5, stress: -12 }),
        choice("switch", "PRENDRE LA CORRESPONDANCE", "Une autre rame part dans quelques secondes.", "neutral", "Tu changes de rame pour gagner du temps. Les portes se ferment derrière toi.", "switch", { switchTrain: true, stress: 4 }),
        choice("help", "AIDER LES PASSAGERS À SORTIR", "Tu prends quelques secondes pour les aider.", "safe", "Tu aides plusieurs personnes à descendre avant de remonter. Tu arrives un peu après, mais tu gardes ton calme.", "none", { stress: -8, money: 10 })
      ]
    )
  ];

  const candidates = generic.filter(function unseen(item) {
    if (item.id === "last-stretch" && state.round < state.maxRounds - 3) return false;
    return !state.seenEvents.includes(item.id);
  });
  if (candidates.length > 0) {
    const index = hash(state.seed + ":generic:" + state.round) % candidates.length;
    return candidates[index] ?? generic[0];
  }

  return generic[hash(state.seed + ":fallback:" + state.round) % generic.length] ?? generic[0];
}
