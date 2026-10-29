/* 分野：五度圏と調号。調号の数 ⇔ キー、平行調、五度圏で隣のキー（すべて 4択）。 */
import { shuffle } from "../../drill/rng";
import type { Question, Topic } from "../../drill/topic";
import { type Key, FIFTHS, KEYS, keyId, keyLabel, keySignature, note } from "../../theory";
import * as Lesson from "./lesson";

const ALL: readonly Key[] = [...KEYS.major, ...KEYS.minor];
const byId = new Map(ALL.map(k => [keyId(k), k]));

/** 五度圏での位置（C / Am = 0、時計回りに ♯ が増える） */
const posOf = (k: Key) => FIFTHS[k.mode].findIndex(r => keyId({ mode: k.mode, tonic: note(r) }) === keyId(k));
const atPos = (mode: Key["mode"], i: number): Key => ({ mode, tonic: note(FIFTHS[mode][((i % 12) + 12) % 12]!) });

export const sigLabel = (n: number): string => (n === 0 ? "なし" : n > 0 ? `♯${n}つ` : `♭${-n}つ`);
const modeLabel = (k: Key) => (k.mode === "major" ? "メジャー" : "マイナー");

/** 調号の音（♯は F C G D A E B、♭は B E A D G C F の順に付く） */
export const accidentals = (n: number): string[] =>
  n >= 0 ? [..."FCGDAEB"].slice(0, n).map(l => `${l}♯`) : [..."BEADGCF"].slice(0, -n).map(l => `${l}♭`);

/** 調号から主音を出す覚え方 */
function ruleText(k: Key, sig: number): string {
  if (k.mode === "minor") return "マイナーは、同じ調号のメジャー（平行調）の主音から短3度下";
  if (sig === 0) return "メジャーで調号なしは C";
  const acc = accidentals(sig);
  if (sig > 0) return `♯のメジャーは、最後の♯（${acc.at(-1)}）の半音上が主音`;
  return sig === -1 ? "♭1 つは F（覚えるしかない）" : `♭のメジャーは、最後から 2 つ目の♭（${acc.at(-2)}）が主音`;
}

/** 調号の覚え方（ヒント） */
const SIG_TIP =
  "♯は F C G D A E B の順に付き、メジャーは最後の♯の半音上が主音。♭は B E A D G C F の順に付き、メジャーは最後から 2 つ目の♭が主音（♭1 つは F）";

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
    const acc = accidentals(sig);
    const explanation = {
      text: [
        `${keyLabel(k)}：調号${sigLabel(sig)}${acc.length ? `（${acc.join(" ")}）` : ""}／平行調 ${keyLabel(relative(k))}`,
        ruleText(k, sig),
      ].join("\n"),
      // 五度圏の並び（右へ 5 度上）。調号も添えて、1 つずつ増えるのを見せる
      strip: [-2, -1, 0, 1, 2].map(d => {
        const x = atPos(k.mode, p + d);
        return { label: keyLabel(x), sub: sigLabel(keySignature(x)).replace("つ", ""), current: d === 0 };
      }),
      stripLabel: "五度圏の並び（右へ 5 度上）",
    };
    const choice = (text: string, correct: string, candidates: string[], hint: string): Question => ({
      item: id,
      prompt: { text },
      answer: { kind: "choice", options: shuffle(rng, fill(correct, candidates)), correct },
      hint: { text: hint },
      explanation,
    });
    const minorTip = "マイナーは、平行調（短3度上のメジャー）と同じ調号";
    switch (kind) {
      case "sig": {
        const near = [sig + 1, sig - 1, -sig, sig + 2, sig - 2].filter(n => Math.abs(n) <= 7).map(sigLabel);
        return choice(
          `キー ${keyLabel(k)} の調号は？`,
          sigLabel(sig),
          shuffle(rng, near),
          k.mode === "minor" ? `${minorTip}。${SIG_TIP}` : SIG_TIP,
        );
      }
      case "key": {
        // 調号が 1 つ違うキーと、♯♭を取り違えたキー
        const opposite = ALL.filter(x => x.mode === k.mode && keySignature(x) === -sig).map(keyLabel);
        return choice(
          `調号${sigLabel(sig)}の${modeLabel(k)}キーは？`,
          keyLabel(k),
          [...shuffle(rng, [sameMode(1), sameMode(-1), ...opposite]), sameMode(2), sameMode(-2)],
          k.mode === "minor" ? `${SIG_TIP}。マイナーはそのメジャーの主音から短3度下` : SIG_TIP,
        );
      }
      case "rel": {
        const r = relative(k);
        const rp = posOf(r);
        const parallel = keyLabel({ mode: r.mode, tonic: k.tonic });
        return choice(
          `${keyLabel(k)} の平行調は？`,
          keyLabel(r),
          [
            ...shuffle(rng, [parallel, keyLabel(atPos(r.mode, rp + 1)), keyLabel(atPos(r.mode, rp - 1))]),
            keyLabel(atPos(r.mode, rp + 2)),
          ],
          "平行調は調号が同じもう一方。メジャー → 短3度下（スケールの 6 番目の音）のマイナー、マイナー → 短3度上のメジャー",
        );
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
          `5 度上は主音から文字で 5 つ目（C → G）、5 度下は 5 つ下（C → F）。時計回りに 1 つ進むたびに♯が 1 つ増える（♭が 1 つ減る）`,
        );
      }
    }
  },

  reference: ({ ctx }) => {
    const size = 320,
      c = size / 2;
    const at = (i: number, r: number) => {
      const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
      return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
    };
    return (
      <>
        <Lesson.Intro />
        <p class="muted small">外側がメジャーキー、内側が同じ調号の平行調（マイナー）、その間が調号の数。</p>
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
        <Lesson.Body standard={ctx.common.tuning.id === "standard"} />
      </>
    );
  },
};
