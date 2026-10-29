/* 参考の本文：モードの特性音 */
import { SCALES, type ScaleId, degree, mod, semitones } from "../../theory";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { DegreeGrid, type DegreeRow, Fig, Figs, type KeyArc, type KeyMark, Keys, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>7 つのモードは、どれもメジャースケールの 7 音を別の音から並べ直したもの</li>
      <li>
        比べる相手は 2 つだけ：明るい系は<strong>メジャー（アイオニアン）</strong>、暗い系は
        <strong>ナチュラルマイナー（エオリアン）</strong>
      </li>
      <li>
        比べたときに違う 1 音が<strong>特性音</strong>。その音を鳴らすとそのモードらしく聞こえる
      </li>
    </Points>
  );
}

/** 明るい順（modes/index の BRIGHTNESS と同じ。index から読むと循環するので持つ） */
const BRIGHT: readonly [ScaleId, string][] = [
  ["lydian", "リディアン"],
  ["major", "アイオニアン"],
  ["mixolydian", "ミクソリディアン"],
  ["dorian", "ドリアン"],
  ["natural_minor", "エオリアン"],
  ["phrygian", "フリジアン"],
  ["locrian", "ロクリアン"],
];

const semisOf = (id: ScaleId) => new Set(SCALES[id].degrees.map(d => mod(semitones(degree(d)), 12)));

/** 1 つ上の行に無い音（半音下がった音）を目立たせた、明るい順の表 */
const BRIGHT_ROWS: DegreeRow[] = BRIGHT.map(([id, name], i) => {
  const prev = i > 0 ? semisOf(BRIGHT[i - 1]![0]) : undefined;
  return {
    name,
    degrees: SCALES[id].degrees,
    em: prev ? SCALES[id].degrees.filter(d => !prev.has(mod(semitones(degree(d)), 12))) : [],
  };
});

/** a と比べて違う度数を目立たせた b の行 */
const vsRow = (a: ScaleId, b: ScaleId, name: string): DegreeRow => {
  const base = semisOf(a);
  return {
    name,
    degrees: SCALES[b].degrees,
    em: SCALES[b].degrees.filter(d => !base.has(mod(semitones(degree(d)), 12))),
  };
};

const WHITE = [0, 2, 4, 5, 7, 9, 11];
/** 白鍵だけを start（C からの半音）から 1 オクターブ。半音のところに弧 */
function WhiteFrom({ start, degrees, label }: { start: number; degrees: string[]; label: string }) {
  const keys: number[] = [];
  for (let s = start; keys.length < 8; s++) if (WHITE.includes(mod(s, 12))) keys.push(s);
  const marks: KeyMark[] = keys.map((semi, i) => ({
    semi,
    label: degrees[i % 7]!,
    kind: i % 7 === 0 ? "root" : "tone",
  }));
  const arcs: KeyArc[] = keys
    .slice(1)
    .map((to, i) => ({ from: keys[i]!, to, label: "半", below: true, hl: true }))
    .filter(a => a.to - a.from === 1);
  return <Keys keys={keys.at(-1)! + 1} marks={marks} arcs={arcs} label={label} />;
}

/** モード → 親のメジャーキー */
const PARENTS: readonly [string, string, string][] = [
  ["D", "ドリアン", "全音下"],
  ["E", "フリジアン", "長3度下"],
  ["F", "リディアン", "4度下"],
  ["G", "ミクソリディアン", "4度上"],
  ["A", "エオリアン", "短3度上"],
  ["B", "ロクリアン", "半音上"],
];

/** 音の札（start の音を強調） */
const run = (names: string[]) =>
  names.map((label, i) => ({ label, kind: i === 0 || i === names.length - 1 ? ("hl" as const) : undefined }));

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャースケール（C D E F G A B）を D から並べると D ドリアン、E からならフリジアン、F からならリディアン、G
          からならミクソリディアン、A からならエオリアン（ナチュラルマイナー）、B
          からならロクリアン。使う音は同じでも、主音が変わると全音・半音の並び方が変わり、響きが変わる。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">モード</th>
              <th scope="col">比べる相手</th>
              <th scope="col">特性音</th>
              <th scope="col">合うコード</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>リディアン</td>
              <td>メジャー</td>
              <td>♯4</td>
              <td>M7（♯11）</td>
            </tr>
            <tr>
              <td>アイオニアン</td>
              <td>（メジャーそのもの）</td>
              <td>—</td>
              <td>M7</td>
            </tr>
            <tr>
              <td>ミクソリディアン</td>
              <td>メジャー</td>
              <td>♭7</td>
              <td>7</td>
            </tr>
            <tr>
              <td>ドリアン</td>
              <td>ナチュラルマイナー</td>
              <td>6</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>エオリアン</td>
              <td>（ナチュラルマイナーそのもの）</td>
              <td>—</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>フリジアン</td>
              <td>ナチュラルマイナー</td>
              <td>♭2</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>ロクリアン</td>
              <td>ナチュラルマイナー</td>
              <td>♭2・♭5</td>
              <td>m7(♭5)</td>
            </tr>
          </tbody>
        </table>
        <Figs wide>
          <Fig title="D ドリアン" caption="白鍵だけを D から D まで。半音（弧）は 2–3 番目と 6–7 番目の間">
            <WhiteFrom start={2} degrees={["R", "2", "♭3", "4", "5", "6", "♭7"]} label="D ドリアン：D E F G A B C" />
          </Fig>
          <Fig title="E フリジアン" caption="同じ白鍵でも E から始めると、半音がいきなり 1–2 番目に来る（♭2）">
            <WhiteFrom
              start={4}
              degrees={["R", "♭2", "♭3", "4", "5", "♭6", "♭7"]}
              label="E フリジアン：E F G A B C D"
            />
          </Fig>
        </Figs>
        <p class="muted small">
          鍵盤の音は同じ 7 つ。主音（オレンジ）を替えると半音の位置がずれ、度数（点の中の字）が変わる。
        </p>
      </Section>
      <Tips>
        <Tip title="明るい順に 1 音ずつ ♭ が増える">
          リディアン → アイオニアン → ミクソリディアン → ドリアン → エオリアン → フリジアン → ロクリアン。右へ 1
          つ進むごとに、どこか 1 音が半音下がる。並びを覚えれば、隣のモードとの違いが 1 音で分かる。
          <Fig caption="どれも同じ主音で並べた表。色のマスが、1 つ上の行から半音下がった音。上の数字は R からの半音">
            <DegreeGrid label="7 つのモードを明るい順に並べた度数の表" rows={BRIGHT_ROWS} />
          </Fig>
        </Tip>
        <Tip title="親のメジャーキーを探す">
          X ドリアンは X の全音下のメジャー、フリジアンは長 3 度下、リディアンは 4 度下、ミクソリディアンは 4
          度上、エオリアンは短 3 度上、ロクリアンは半音上のメジャーと同じ音（D ドリアン → C、E フリジアン → C、G
          ミクソリディアン → C）。
          <Figs>
            {PARENTS.map(([n, name, how]) => (
              <Fig key={n} title={`${n} ${name}`}>
                <Steps items={[{ label: n }, { label: "C", sub: "親", kind: "hl" }]} gaps={[{ label: `${how}→` }]} />
              </Fig>
            ))}
          </Figs>
          <p class="muted small">どれも C メジャーと同じ 7 音（白鍵だけ）。</p>
        </Tip>
        <Tip title="コードの型でまず 2 つに分ける">
          3 度が長い（メジャー系）か短い（マイナー系）かで分け、次に特性音で決める。7
          のコードならミクソリディアン、m7(♭5) ならロクリアン。
          <Fig title="3 度が長い（メジャー系）">
            <Steps
              items={[
                { label: "リディアン", sub: "M7・♯4" },
                { label: "アイオニアン", sub: "M7" },
                { label: "ミクソ", sub: "7・♭7", kind: "hl" },
              ]}
            />
          </Fig>
          <Fig title="3 度が短い（マイナー系）">
            <Steps
              items={[
                { label: "ドリアン", sub: "m7・6" },
                { label: "エオリアン", sub: "m7" },
                { label: "フリジアン", sub: "m7・♭2" },
                { label: "ロクリアン", sub: "m7(♭5)", kind: "hl" },
              ]}
            />
          </Fig>
          <p class="muted small">下の字は合うコードと特性音。色の札は、コードの型だけで 1 つに決まるもの。</p>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          「D ドリアン＝C メジャー」と覚えて、C から弾いてしまう。主音は D。D を中心に、D の上で鳴らす
          <Figs wide>
            <Fig verdict="ok" caption="D から始めて D で終わる。D が落ち着く音に聞こえる">
              <Steps items={run(["D", "E", "F", "G", "A", "B", "C", "D"])} />
            </Fig>
            <Fig verdict="ng" caption="同じ音でも C から C だと、C メジャーに聞こえる">
              <Steps
                items={run(["C", "D", "E", "F", "G", "A", "B", "C"]).map(i =>
                  i.kind ? { ...i, kind: "ng" as const } : i,
                )}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          特性音を探すとき、比べる相手を間違える（ドリアンはメジャーではなく、ナチュラルマイナーと比べる）
          <Figs wide>
            <Fig verdict="ok" caption="エオリアンと比べると、違うのは 6 の 1 マスだけ。これが特性音">
              <DegreeGrid
                label="エオリアンとドリアンの比較"
                rows={[
                  { name: "エオリアン", degrees: SCALES.natural_minor.degrees },
                  vsRow("natural_minor", "dorian", "ドリアン"),
                ]}
              />
            </Fig>
            <Fig verdict="ng" caption="メジャーと比べると ♭3 と ♭7 の 2 マスが違い、どれが特性音か決まらない">
              <DegreeGrid
                label="メジャーとドリアンの比較"
                rows={[
                  { name: "アイオニアン（メジャー）", degrees: SCALES.major.degrees },
                  vsRow("major", "dorian", "ドリアン"),
                ]}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>同じ主音（たとえば A）で、A エオリアンと A ドリアンを続けて弾き、6 度の 1 音の違いを聴く</li>
          <li>
            ルートの音（開放弦など）を鳴らしっぱなしにして、その上でモードを弾き、特性音で響きが変わるのを確かめる
          </li>
        </ul>
      </Section>
    </>
  );
}
