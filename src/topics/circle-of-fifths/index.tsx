/* 分野：五度圏と調号。調号の数 ⇔ キー、平行調、五度圏で隣のキー（すべて 4択）。 */
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type Key, FIFTHS, KEYS, keyId, keyLabel, keySignature, note } from "../../theory";

const ALL: readonly Key[] = [...KEYS.major, ...KEYS.minor];
const byId = new Map(ALL.map(k => [keyId(k), k]));

/** 五度圏での位置（C / Am = 0、時計回りに ♯ が増える） */
const posOf = (k: Key) => FIFTHS[k.mode].findIndex(r => keyId({ mode: k.mode, tonic: note(r) }) === keyId(k));
const atPos = (mode: Key["mode"], i: number): Key => ({ mode, tonic: note(FIFTHS[mode][((i % 12) + 12) % 12]!) });

export const sigLabel = (n: number): string => (n === 0 ? "なし" : n > 0 ? `♯${n}つ` : `♭${-n}つ`);
const modeLabel = (k: Key) => (k.mode === "major" ? "メジャー" : "マイナー");

/** 平行調（同じ調号のもう一方） */
export const relative = (k: Key): Key => atPos(k.mode === "major" ? "minor" : "major", posOf(k));

function fill(correct: string, candidates: readonly string[]): string[] {
  const out = [correct];
  for (const c of candidates) {
    if (!out.includes(c)) out.push(c);
    if (out.length === 4) break;
  }
  return out;
}

type Kind = "sig" | "key" | "rel" | "up" | "down";
const KINDS: readonly Kind[] = ["sig", "key", "rel", "up", "down"];

export const circleOfFifths: Topic = {
  id: "circle-of-fifths",
  level: "intermediate",
  title: "五度圏と調号",

  // ♯系→♭系の順に、メジャーとマイナーを交互に
  items: () => KEYS.major.flatMap((k, i) => [k, KEYS.minor[i]!]).flatMap(k => KINDS.map(x => `${x}:${keyId(k)}`)),

  itemLabel(id) {
    const [kind, kid] = id.split(":") as [Kind, string];
    const k = byId.get(kid)!;
    return {
      sig: `${keyLabel(k)} の調号`,
      key: `調号${sigLabel(keySignature(k))}の${modeLabel(k)}キー`,
      rel: `${keyLabel(k)} の平行調`,
      up: `${keyLabel(k)} の 5 度上`,
      down: `${keyLabel(k)} の 5 度下`,
    }[kind];
  },

  question(id, _ctx, rng): Question {
    const [kind, kid] = id.split(":") as [Kind, string];
    const k = byId.get(kid)!;
    const sig = keySignature(k);
    const p = posOf(k);
    const sameMode = (d: number) => keyLabel(atPos(k.mode, p + d));
    const explanation = {
      text: `${keyLabel(k)}：調号${sigLabel(sig)}／平行調 ${keyLabel(relative(k))}／5 度上 ${sameMode(1)}・5 度下 ${sameMode(-1)}`,
    };
    const choice = (text: string, correct: string, candidates: string[]): Question => ({
      item: id,
      prompt: { text },
      answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
      explanation,
    });
    switch (kind) {
      case "sig": {
        const near = [sig + 1, sig - 1, -sig, sig + 2, sig - 2].filter(n => Math.abs(n) <= 7).map(sigLabel);
        return choice(`キー ${keyLabel(k)} の調号は？`, sigLabel(sig), shuffle(rng, near));
      }
      case "key": {
        // 調号が 1 つ違うキーと、♯♭を取り違えたキー
        const opposite = ALL.filter(x => x.mode === k.mode && keySignature(x) === -sig).map(keyLabel);
        return choice(`調号${sigLabel(sig)}の${modeLabel(k)}キーは？`, keyLabel(k), [
          ...shuffle(rng, [sameMode(1), sameMode(-1), ...opposite]),
          sameMode(2),
          sameMode(-2),
        ]);
      }
      case "rel": {
        const r = relative(k);
        const rp = posOf(r);
        const parallel = keyLabel({ mode: r.mode, tonic: k.tonic });
        return choice(`${keyLabel(k)} の平行調は？`, keyLabel(r), [
          ...shuffle(rng, [parallel, keyLabel(atPos(r.mode, rp + 1)), keyLabel(atPos(r.mode, rp - 1))]),
          keyLabel(atPos(r.mode, rp + 2)),
        ]);
      }
      case "up":
      case "down": {
        const d = kind === "up" ? 1 : -1;
        return choice(
          `五度圏で ${keyLabel(k)} の 5 度${kind === "up" ? "上（時計回りの隣）" : "下（反時計回りの隣）"}は？`,
          sameMode(d),
          [
            ...shuffle(rng, [sameMode(-d), sameMode(2 * d), keyLabel(relative(atPos(k.mode, p + d)))]),
            sameMode(-2 * d),
          ],
        );
      }
    }
  },

  reference: () => {
    const size = 320,
      c = size / 2;
    const at = (i: number, r: number) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
    };
    return (
      <>
        <p>
          時計回りに 5 度ずつ上がり、♯が 1 つずつ増える。反時計回りは
          ♭が増える。同じ位置の内側が平行調（調号が同じマイナー）。
        </p>
        <svg class="circle5" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="五度圏">
          <circle cx={c} cy={c} r={150} class="c5-ring" />
          <circle cx={c} cy={c} r={92} class="c5-ring" />
          {FIFTHS.major.map((_, i) => {
            const maj = atPos("major", i),
              min = atPos("minor", i);
            const o = at(i, 128),
              m = at(i, 74),
              s = at(i, 105);
            return (
              <g key={i}>
                <text class="c5-major" x={o.x} y={o.y}>
                  {keyLabel(maj)}
                </text>
                <text class="c5-sig" x={s.x} y={s.y}>
                  {sigLabel(keySignature(maj)).replace("つ", "")}
                </text>
                <text class="c5-minor" x={m.x} y={m.y}>
                  {keyLabel(min)}
                </text>
              </g>
            );
          })}
        </svg>
        <p class="muted">F♯ と G♭（♯6・♭6）は同じ音のキー。このアプリでは F♯ と E♭m で数える。</p>
      </>
    );
  },
};
