/* 試聴（Web Audio。guitar_chart と同じ：三角波、A4=440、R から上行して 1 オクターブ上の R まで）。 */
import { mod } from "../theory";

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (!ctx) {
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = g.AudioContext ?? g.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** ルートの周波数。A を A4（440Hz）にし、C〜B を同じオクターブに置く */
export const rootFrequency = (rootPc: number): number => 440 * 2 ** ((mod(rootPc, 12) - 9) / 12);

function tone(c: AudioContext, freq: number, start: number, dur: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  // 立ち上がりと終わりを短く絞って、プツッという音を消す
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
  gain.gain.setValueAtTime(0.25, start + dur - 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** 上行で鳴らす。鳴らす半音数の並び（R…と 12）を返す */
export function playAscending(intervals: readonly number[], rootPc: number): number[] {
  const semis = [...intervals, 12];
  const c = audioCtx();
  if (!c) return semis;
  if (c.state === "suspended") void c.resume(); // 端末によっては操作のあとでないと鳴らない
  const f0 = rootFrequency(rootPc);
  const dur = 0.32,
    gap = 0.02;
  let t = c.currentTime + 0.06;
  for (const s of semis) {
    tone(c, f0 * 2 ** (s / 12), t, dur);
    t += dur + gap;
  }
  return semis;
}

export const midiFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** MIDI ノート番号の並びを順に鳴らす。chord なら最後に全部を重ねて鳴らす */
export function playMidi(notes: readonly number[], { chord = false }: { chord?: boolean } = {}): void {
  const c = audioCtx();
  if (!c || !notes.length) return;
  if (c.state === "suspended") void c.resume();
  const dur = 0.42,
    gap = 0.04;
  let t = c.currentTime + 0.06;
  for (const m of notes) {
    tone(c, midiFrequency(m), t, dur);
    t += dur + gap;
  }
  if (chord && notes.length > 1) for (const m of notes) tone(c, midiFrequency(m), t, dur * 3);
}
