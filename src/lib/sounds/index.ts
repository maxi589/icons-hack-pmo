import { decodeAudioData, getAudioContext } from "./engine";
import type { SoundAsset } from "./types";
import { confirmation001Sound } from "./confirmation-001";
import { confirmation004Sound } from "./confirmation-004";
import { drop002Sound } from "./drop-002";
import { drop003Sound } from "./drop-003";
import { jinglesPizzi10Sound } from "./jingles-pizzi-10";
import { maximize008Sound } from "./maximize-008";
import { minimize008Sound } from "./minimize-008";

// Sounds „Standard“ (Design-System, Abschnitt 7). Alle aus soundcn, Kenney CC0. Nie `warcraft`.
// Ein Modul für die ganze App: `play("taskDone")` geht von überall, auch außerhalb von React.
// Sounds sind immer an (Maxi, 14.10.: kein Schalter, kein Fun-Modus; stumm geht über das Gerät).

type Moment = {
  sounds: SoundAsset[];
  volume: number;
  /** Tempo zufällig ± diesen Anteil, damit Wiederholungen nicht mechanisch klingen. */
  vary?: number;
};

const MOMENTS = {
  taskDone: { sounds: [confirmation001Sound], volume: 0.19 },
  dealWon: { sounds: [confirmation004Sound], volume: 0.32 },
  milestoneDone: { sounds: [jinglesPizzi10Sound], volume: 0.35 },
  drop: { sounds: [drop002Sound, drop003Sound], volume: 0.12, vary: 0.04 },
  paletteOpen: { sounds: [maximize008Sound], volume: 0.11 },
  paletteClose: { sounds: [minimize008Sound], volume: 0.11 },
} satisfies Record<string, Moment>;

export type SoundName = keyof typeof MOMENTS;

/** Zentrale Lautstärke für alle Sounds (eine GainNode vor dem Ausgang). */
const MASTER_VOLUME = 1;
/** Höchstens ein Abspielen pro Moment in diesem Abstand. */
const MIN_GAP_MS = 70;

const lastPlayed = new Map<SoundName, number>();
const turn = new Map<SoundName, number>();
let master: GainNode | null = null;

function output(ctx: AudioContext) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  return master;
}

/**
 * Dekodiert alle Sounds einmal vor. Erst nach der ersten Berührung oder Taste aufrufen:
 * Browser erlauben Ton erst nach einer Nutzer-Aktion (sonst Warnung in der Konsole).
 */
export function preloadSounds() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  for (const m of Object.values(MOMENTS)) for (const s of m.sounds) decodeAudioData(s.dataUri).catch(() => {});
}

export function play(name: SoundName) {
  const moment: Moment = MOMENTS[name];
  if (typeof window === "undefined") return;

  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);

  // Mehrere Sounds je Moment (Karte ablegen): im Wechsel.
  const i = turn.get(name) ?? 0;
  turn.set(name, i + 1);
  const sound = moment.sounds[i % moment.sounds.length];

  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();
  decodeAudioData(sound.dataUri)
    .then((buffer) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = moment.vary ? 1 + (Math.random() * 2 - 1) * moment.vary : 1;
      gain.gain.value = moment.volume;
      source.connect(gain);
      gain.connect(output(ctx));
      source.start(0);
    })
    .catch(() => {});
}
