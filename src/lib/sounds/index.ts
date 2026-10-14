import { decodeAudioData, getAudioContext } from "./engine";
import type { SoundAsset } from "./types";
import { click002Sound } from "./click-002";
import { click003Sound } from "./click-003";
import { confirmation004Sound } from "./confirmation-004";
import { drop002Sound } from "./drop-002";
import { drop003Sound } from "./drop-003";
import { jinglesPizzi10Sound } from "./jingles-pizzi-10";
import { maximize006Sound } from "./maximize-006";
import { maximize008Sound } from "./maximize-008";
import { minimize006Sound } from "./minimize-006";
import { minimize008Sound } from "./minimize-008";
import { switch006Sound } from "./switch-006";

// Sounds (Design-System, Abschnitt 7). Alle aus soundcn, Kenney CC0. Nie `warcraft`.
// Ein Modul für die ganze App: `play("taskDone")` geht von überall, auch außerhalb von React.
// Sounds sind immer an, ohne Schalter; stumm geht über das Gerät.
// Präsenz „Voll“ (Maxi, 14.10., auf dem Sound-Board gewählt): auch Klicks, Umschalten, Detail auf/zu,
// Hinweise und Tippen haben einen leisen Ton. Abhaken = Favoriten-Mix aus click-003 + drop-003.

type Layer = { sound: SoundAsset; volume: number; /** Verzögerung in Sekunden */ delay?: number };
type Moment = {
  /** Mehrere Varianten werden im Wechsel gespielt (z. B. Karte ablegen). */
  sounds?: SoundAsset[];
  volume?: number;
  /** Schichten, die zusammen einen Ton ergeben (z. B. Klick + Drop beim Abhaken). */
  layers?: Layer[];
  /** Tempo zufällig ± diesen Anteil, damit Wiederholungen nicht mechanisch klingen. */
  vary?: number;
};

const MOMENTS = {
  // Lautstärken des Mixes wie auf dem Sound-Board: gleich laut wie der frühere Haken-Ton (gemessen über RMS).
  taskDone: { layers: [{ sound: click003Sound, volume: 0.225 }, { sound: drop003Sound, volume: 0.183, delay: 0.012 }] },
  dealWon: { sounds: [confirmation004Sound], volume: 0.32 },
  milestoneDone: { sounds: [jinglesPizzi10Sound], volume: 0.35 },
  drop: { sounds: [drop002Sound, drop003Sound], volume: 0.12, vary: 0.04 },
  paletteOpen: { sounds: [maximize008Sound], volume: 0.11 },
  paletteClose: { sounds: [minimize008Sound], volume: 0.11 },
  // Präsenz „Voll“
  click: { sounds: [click003Sound], volume: 0.14 },
  toggle: { sounds: [switch006Sound], volume: 0.25 },
  type: { sounds: [click002Sound], volume: 0.17, vary: 0.04 },
  detailOpen: { sounds: [maximize006Sound], volume: 0.11 },
  detailClose: { sounds: [minimize006Sound], volume: 0.11 },
  toast: { sounds: [drop002Sound], volume: 0.12 },
} satisfies Record<string, Moment>;

export type SoundName = keyof typeof MOMENTS;

/** Zentrale Lautstärke für alle Sounds (eine GainNode vor dem Ausgang). */
const MASTER_VOLUME = 1;
/** Höchstens ein Abspielen pro Moment in diesem Abstand (Tippen: schnelle Folgen bleiben hörbar, aber nicht doppelt). */
const MIN_GAP_MS = 70;

const lastPlayed = new Map<SoundName, number>();
const turn = new Map<SoundName, number>();
let master: GainNode | null = null;

/** Momente mit eigenem Ton: Ein Klick- oder Hinweis-Ton direkt danach würde sich nur überlagern. */
const RICH: SoundName[] = ["taskDone", "dealWon", "milestoneDone", "drop", "paletteOpen", "paletteClose", "detailOpen", "detailClose"];
let lastRich = -Infinity;

/** Lief in den letzten `ms` Millisekunden ein Moment mit eigenem Ton? */
export function richPlayedWithin(ms: number) {
  return typeof performance !== "undefined" && performance.now() - lastRich < ms;
}

function output(ctx: AudioContext) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  return master;
}

const assets = (m: Moment) => [...(m.sounds ?? []), ...(m.layers ?? []).map((l) => l.sound)];

/**
 * Dekodiert alle Sounds einmal vor. Erst nach der ersten Berührung oder Taste aufrufen:
 * Browser erlauben Ton erst nach einer Nutzer-Aktion (sonst Warnung in der Konsole).
 */
export function preloadSounds() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  for (const m of Object.values(MOMENTS) as Moment[]) for (const s of assets(m)) decodeAudioData(s.dataUri).catch(() => {});
}

function start(ctx: AudioContext, sound: SoundAsset, volume: number, vary = 0, delay = 0) {
  decodeAudioData(sound.dataUri)
    .then((buffer) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = vary ? 1 + (Math.random() * 2 - 1) * vary : 1;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(output(ctx));
      source.start(ctx.currentTime + delay);
    })
    .catch(() => {});
}

export function play(name: SoundName) {
  const moment: Moment = MOMENTS[name];
  if (typeof window === "undefined") return;

  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);
  if (RICH.includes(name)) lastRich = now;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  if (moment.layers) {
    for (const l of moment.layers) start(ctx, l.sound, l.volume, moment.vary, l.delay);
    return;
  }
  // Mehrere Sounds je Moment (Karte ablegen): im Wechsel.
  const i = turn.get(name) ?? 0;
  turn.set(name, i + 1);
  const list = moment.sounds ?? [];
  start(ctx, list[i % list.length], moment.volume ?? 0.15, moment.vary);
}
