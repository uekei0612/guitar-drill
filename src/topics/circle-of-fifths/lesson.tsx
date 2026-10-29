/* 参考の本文：五度圏と調号 */
import { FIFTHS, fmt, note } from "../../theory";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, Keys, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>五度圏は、12 のキーを 5 度ずつ並べた円。時計回りに 1 つ進むごとに ♯ が 1 つ増え、反時計回りは ♭ が増える</li>
      <li>
        ♯ の付く順は <strong>F C G D A E B</strong>（ファドソレラミシ）、♭ はその逆の <strong>B E A D G C F</strong>
      </li>
      <li>隣どうしのキーは調号が 1 つしか違わない＝よく似た（近い）キー</li>
    </Points>
  );
}

/** 五度圏の位置 i（C = 0、時計回り）の角度 */
const angle = (i: number) => (i / 12) * 2 * Math.PI - Math.PI / 2;

/** 小さな五度圏。外がメジャー、内がマイナー。印を付けた位置と、位置から位置への矢印 */
function MiniCircle({
  root,
  tones = [],
  minors = [],
  arrows = [],
  label,
}: {
  /** オレンジにするメジャーの位置 */
  root?: number;
  /** 黒くするメジャーの位置 */
  tones?: readonly number[];
  /** 輪で囲むマイナーの位置 */
  minors?: readonly number[];
  /** [from, to]（隣どうし。to が反時計回りなら逆向きの矢印） */
  arrows?: readonly (readonly [number, number])[];
  label: string;
}) {
  const S = 220,
    c = S / 2;
  const pt = (i: number, r: number) => ({ x: c + r * Math.cos(angle(i)), y: c + r * Math.sin(angle(i)) });
  return (
    <svg class="c5mini" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label}>
      <circle class="c5mini-ring" cx={c} cy={c} r={82} />
      {arrows.map(([from, to], k) => {
        const R = 104,
          a = pt(from, R);
        // 時計回り（i が増える）なら sweep = 1
        const cw = (to - from + 12) % 12 <= 6;
        const t = angle(to) + (cw ? -0.12 : 0.12);
        const end = { x: c + R * Math.cos(t), y: c + R * Math.sin(t) };
        // 矢じり：終点で接線の向き
        const d = cw ? { x: -Math.sin(t), y: Math.cos(t) } : { x: Math.sin(t), y: -Math.cos(t) };
        const n = { x: Math.cos(t), y: Math.sin(t) };
        const tip = { x: end.x + d.x * 5, y: end.y + d.y * 5 };
        const l = { x: end.x - d.x * 3 + n.x * 5, y: end.y - d.y * 3 + n.y * 5 };
        const r = { x: end.x - d.x * 3 - n.x * 5, y: end.y - d.y * 3 - n.y * 5 };
        return (
          <g key={k} class="c5mini-arrow" aria-hidden="true">
            <path d={`M ${a.x} ${a.y} A ${R} ${R} 0 0 ${cw ? 1 : 0} ${end.x} ${end.y}`} />
            <polygon points={`${tip.x},${tip.y} ${l.x},${l.y} ${r.x},${r.y}`} />
          </g>
        );
      })}
      {FIFTHS.major.map((name, i) => {
        const o = pt(i, 82),
          m = pt(i, 50);
        const kind = i === root ? " root" : tones.includes(i) ? " tone" : "";
        return (
          <g key={i} aria-hidden="true">
            <circle class={`c5mini-dot${kind}`} cx={o.x} cy={o.y} r={15} />
            <text class={`c5mini-major${kind}`} x={o.x} y={o.y}>
              {fmt(note(name))}
            </text>
            {minors.includes(i) && <circle class="c5mini-minor-ring" cx={m.x} cy={m.y} r={15} />}
            <text class={`c5mini-minor${minors.includes(i) ? " em" : ""}`} x={m.x} y={m.y}>
              {fmt(note(FIFTHS.minor[i]!))}m
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** C から 5 度ずつ進んだときに増える調号 */
const UP = [
  { label: "C", sub: "なし" },
  { label: "G", sub: "＋F♯" },
  { label: "D", sub: "＋C♯" },
  { label: "A", sub: "＋G♯" },
];
const DOWN = [
  { label: "C", sub: "なし" },
  { label: "F", sub: "＋B♭" },
  { label: "B♭", sub: "＋E♭" },
  { label: "E♭", sub: "＋A♭" },
];

export function Body({ standard }: { standard: boolean }) {
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャー（調号なし）の 5 度上の G メジャーでは、F が F♯ になる。さらに 5 度上の D では C も ♯
          になる。こうして 5 度上がるたびに ♯ が 1 つずつ増える。逆に 5 度下（4 度上）へ進むと ♭ が 1 つずつ増える（F は
          B♭、B♭ は B♭ と E♭）。
        </p>
        <Fig caption="時計回り（5 度上）に進むたびに ♯ が 1 つ増える">
          <Steps items={UP} gaps={UP.slice(1).map(() => ({ label: "5度上→" }))} label="C G D A と ♯ が増える" />
        </Fig>
        <Fig caption="反時計回り（5 度下）に進むたびに ♭ が 1 つ増える">
          <Steps items={DOWN} gaps={DOWN.slice(1).map(() => ({ label: "5度下→" }))} label="C F B♭ E♭ と ♭ が増える" />
        </Fig>
        <Fig caption="G メジャースケール。C メジャーとの違いは F が F♯ になる 1 音（輪）だけ">
          <Keys
            keys={19}
            label="G メジャースケール：G A B C D E F♯"
            marks={[
              { semi: 7, label: "G", kind: "root" },
              { semi: 9, label: "A" },
              { semi: 11, label: "B" },
              { semi: 12, label: "C" },
              { semi: 14, label: "D" },
              { semi: 16, label: "E" },
              { semi: 18, label: "F♯", kind: "em" },
            ]}
          />
        </Fig>
        <h3>五度圏の使い道</h3>
        <ul>
          <li>キーの調号の数がすぐ分かる</li>
          <li>
            メジャーキーの <strong>Ⅳ は左隣（反時計回り）、Ⅴ は右隣（時計回り）</strong>。C なら F と G。Ⅰ–Ⅳ–Ⅴ
            がひと目で分かる
          </li>
          <li>内側の平行調（調号が同じマイナー）で、Ⅵm も分かる（C の内側の Am）</li>
          <li>
            Ⅴ7 → Ⅰ のように 5 度下へ進む流れは、円を反時計回りに 1 つ進むこと。Ⅵ → Ⅱ → Ⅴ → Ⅰ は 3 回続けて反時計回り（C
            なら A → D → G → C）
          </li>
        </ul>
        <Figs wide>
          <Fig caption="C の左右が Ⅳ（F）と Ⅴ（G）。内側の Am が Ⅵm">
            <MiniCircle root={0} tones={[11, 1]} minors={[0]} label="C の Ⅳ・Ⅴ・Ⅵm" />
          </Fig>
          <Fig caption="Ⅵ → Ⅱ → Ⅴ → Ⅰ（A → D → G → C）は反時計回りに 3 つ">
            <MiniCircle
              root={0}
              tones={[3, 2, 1]}
              arrows={[
                [3, 2],
                [2, 1],
                [1, 0],
              ]}
              label="A D G C と反時計回りに進む"
            />
          </Fig>
        </Figs>
      </Section>
      <Tips>
        <Tip title="♯ のキーは最後の ♯ の半音上">
          ♯ 3 つなら F♯ C♯ G♯ で、最後の G♯ の半音上の A がメジャーの主音。
          <Steps
            label="F♯ C♯ G♯ の最後の G♯ の半音上が A"
            items={[
              { label: "F♯" },
              { label: "C♯" },
              { label: "G♯", sub: "最後" },
              { label: "A", sub: "主音", kind: "hl" },
            ]}
            gaps={[{ label: "" }, { label: "" }, { label: "半音上→", hl: true }]}
          />
        </Tip>
        <Tip title="♭ のキーは最後から 2 つ目の ♭">
          ♭ 3 つなら B♭ E♭ A♭ で、最後から 2 つ目の E♭ が主音。♭ 1 つだけは例外で F と覚える。
          <Steps
            label="B♭ E♭ A♭ の、最後から 2 つ目の E♭ が主音"
            items={[
              { label: "B♭" },
              { label: "E♭", sub: "主音", kind: "hl" },
              { label: "A♭", sub: "最後", kind: "dim" },
            ]}
          />
        </Tip>
        <Tip title="マイナーは短 3 度下（6 番目の音）">
          同じ調号のマイナーは、メジャーの主音から短 3 度下（メジャースケールの 6 番目）。C → Am、G → Em、F → Dm。
          <Fig caption="C から半音 3 つ下の A が、平行調（Am）の主音">
            <Keys
              keys={13}
              label="C の短 3 度下が A"
              marks={[
                { semi: 9, label: "A", kind: "em" },
                { semi: 12, label: "C", kind: "root" },
              ]}
              arcs={[{ from: 12, to: 9, label: "3", hl: true }]}
            />
          </Fig>
        </Tip>
        {standard && (
          <Tip title="ギターの上で五度圏を回る">
            6 弦のある音から 5 弦の同じフレットへ移ると 4 度上＝反時計回りに 1 つ（6 弦 3 フレットの G → 5 弦 3
            フレットの C）。逆に 5 弦 → 6 弦の同じフレットは時計回り。
            <Fig caption="3 フレットを細い弦へ G → C → F → B♭。1 本移るたびに反時計回りに 1 つ（4 度上）">
              <Board
                range={{ minFret: 1, maxFret: 5 }}
                orientation="horizontal"
                label="同じフレットで弦を移ると 4 度上"
                marks={[
                  { pos: { string: 6, fret: 3 }, kind: "root", label: "G" },
                  { pos: { string: 5, fret: 3 }, kind: "tone", label: "C" },
                  { pos: { string: 4, fret: 3 }, kind: "tone", label: "F" },
                  { pos: { string: 3, fret: 3 }, kind: "tone", label: "B♭" },
                ]}
              />
            </Fig>
          </Tip>
        )}
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>
          ♯ と ♭ の付く順を混ぜる。♭ は ♯ の順を逆から読んだもの（B E A D G C F）
          <Fig caption="上の並びを右から読むと、下の並び">
            <Steps label="♯ の付く順" items={[..."FCGDAEB"].map(l => ({ label: `${l}♯` }))} />
            <Steps label="♭ の付く順" items={[..."BEADGCF"].map(l => ({ label: `${l}♭` }))} />
          </Fig>
        </li>
        <li>
          平行調（C と Am：調号が同じ）と、同主調（C と Cm：主音が同じ）を混同する。Cm の調号は ♭ 3 つ
          <Figs wide>
            <Fig title="平行調" caption="C と Am は同じ位置。調号も同じ（なし）">
              <MiniCircle root={0} minors={[0]} label="C の平行調は Am" />
            </Fig>
            <Fig title="同主調" caption="Cm は E♭ と同じ位置。調号は ♭ 3 つ">
              <MiniCircle root={0} tones={[9]} minors={[9]} label="Cm は E♭ と同じ位置" />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C から時計回りに C G D A E B F♯、反時計回りに C F B♭ E♭ A♭ D♭ G♭ を声に出して一周する</li>
          <li>キーを 1 つ選び、調号の数・付く音・平行調・Ⅳ・Ⅴ を続けて言う（D：♯ 2 つ、F♯ C♯、Bm、G、A）</li>
        </ul>
      </Section>
    </>
  );
}
