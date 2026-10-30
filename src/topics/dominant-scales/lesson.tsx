/* 参考の本文：ドミナントで使うスケール */
import { useContext } from "preact/hooks";
import type { Mark } from "../../drill/topic";
import { SCALES, type ScaleId, degree, degreeLabel, mod, semitones, stringCount } from "../../theory";
import { HScroll } from "../../ui/HScroll";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { DegreeGrid, type DegreeRow, Fig, Figs, Keys, LessonBoard, SomeStrings, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>ドミナント（Ⅴ7）の上で使うスケールは、どれも 3 度と ♭7 を持つ。違うのは 9・11・13 の高さだけ</li>
      <li>
        基準は<strong>ミクソリディアン（R 9 3 11 5 13 ♭7）</strong>。ここから何を ♭・♯ するかで覚える
      </li>
      <li>選び方の第一歩は「解決先がメジャーかマイナーか」</li>
    </Points>
  );
}

/** ミクソリディアンと比べて変わった度数を目立たせた行 */
const MIXO = new Set(SCALES.mixolydian.degrees.map(d => mod(semitones(degree(d)), 12)));
const row = (id: ScaleId, name = SCALES[id].name): DegreeRow => ({
  name,
  degrees: SCALES[id].degrees,
  em: SCALES[id].degrees.filter(d => !MIXO.has(mod(semitones(degree(d)), 12))),
});

/** G から並べた音の札（度数を下に） */
const fromG = (names: string[], degrees: string[], hl: string[] = []) =>
  names.map((label, i) => ({ label, sub: degrees[i], kind: hl.includes(label) ? ("hl" as const) : undefined }));

/** いちばん低い弦で、開放をルートにしたコンビネーション・ディミニッシュ（3 フレットごとに同じ並び） */
function DimRun() {
  const { tuning: t, lefty } = useContext(LessonBoard);
  const low = stringCount(t);
  const degs = SCALES.combination_diminished.degrees;
  const at = new Map(degs.map(d => [mod(semitones(degree(d)), 12), degreeLabel(degree(d))]));
  const marks: Mark[] = [];
  for (let fret = 0; fret <= 12; fret++) {
    const label = at.get(mod(fret, 12));
    if (label) marks.push({ pos: { string: low, fret }, kind: label === "R" ? "root" : "tone", label });
  }
  return (
    <HScroll startAtEnd={lefty}>
      <SomeStrings
        scale={1}
        strings={[low]}
        range={{ minFret: 0, maxFret: 12 }}
        orientation="horizontal"
        label={`${low}弦の開放をルートにしたコンビネーション・ディミニッシュ`}
        marks={marks}
        bands={[0, 3, 6, 9].map(lo => ({ lo, hi: lo + 1, color: 0, label: "" }))}
      />
    </HScroll>
  );
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          7th コードの性格を決めるのは 3 度と ♭7（この 2 音が半音 6
          つ離れて緊張を作る）。スケールのほかの音（9・11・13）は自由度があり、どれを選ぶかで Ⅰ
          へ戻るときの緊張の強さと色が変わる。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">スケール</th>
              <th scope="col">9</th>
              <th scope="col">11</th>
              <th scope="col">13</th>
              <th scope="col">よく使う場面</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ミクソリディアン</td>
              <td>9</td>
              <td>11</td>
              <td>13</td>
              <td>メジャーへ解決（基準）</td>
            </tr>
            <tr>
              <td>リディアン ♭7（リディアンドミナント）</td>
              <td>9</td>
              <td>♯11</td>
              <td>13</td>
              <td>解決しない 7th・裏コード</td>
            </tr>
            <tr>
              <td>HMP5↓（フリジアンドミナント）</td>
              <td>♭9</td>
              <td>11</td>
              <td>♭13</td>
              <td>マイナーへ解決</td>
            </tr>
            <tr>
              <td>コンビネーション・ディミニッシュ</td>
              <td>♭9・♯9</td>
              <td>♯11</td>
              <td>13</td>
              <td>緊張を強く、13 は明るく</td>
            </tr>
            <tr>
              <td>オルタード</td>
              <td>♭9・♯9</td>
              <td>♯11</td>
              <td>♭13</td>
              <td>いちばん強い緊張（5 度も無い）</td>
            </tr>
          </tbody>
        </table>
        <Fig caption="G7 の場合。数字は R からの半音、色の付いたマスがミクソリディアンと違う音。3（半音 4）と ♭7（半音 10）の列は、どのスケールにもある">
          <DegreeGrid
            label="ドミナントのスケールの度数を、ミクソリディアンと比べた表"
            rows={[
              row("mixolydian", "ミクソリディアン（基準）"),
              row("lydian_dominant"),
              row("phrygian_dominant"),
              row("combination_diminished"),
              row("altered"),
            ]}
          />
        </Fig>
      </Section>
      <Tips>
        <Tip title="解決先のキーの音をそのまま使う">
          G7 → C なら、C メジャーの音を G から並べるとミクソリディアン。G7 → Cm なら、C ハーモニックマイナーの音を G
          から並べるとHMP5↓（ハーモニックマイナー・パーフェクト 5th
          ビロウ）。「行き先のキーの音」で考えれば、名前を覚えていなくても音が選べる。
          <Fig title="G7 → C" caption="C メジャーの音を G から → ミクソリディアン">
            <Steps items={fromG(["G", "A", "B", "C", "D", "E", "F"], ["R", "9", "3", "11", "5", "13", "♭7"])} />
          </Fig>
          <Fig title="G7 → Cm" caption="C ハーモニックマイナーの音を G から → HMP5↓。変わるのは A♭ と E♭ の 2 音">
            <Steps
              items={fromG(
                ["G", "A♭", "B", "C", "D", "E♭", "F"],
                ["R", "♭9", "3", "11", "5", "♭13", "♭7"],
                ["A♭", "E♭"],
              )}
            />
          </Fig>
        </Tip>
        <Tip title="♭ が増えるほど緊張が強い">
          ミクソリディアン（♭ なし）→ HMP5↓（♭9・♭13）→ オルタード（9・11・13
          が全部変化）。テンションが変化するほど、解決したときの「戻った」感じが強くなる。
          <Steps
            label="変化したテンションの数：ミクソリディアン 0、HMP5↓ 2、オルタード 4"
            items={[
              { label: "ミクソ", sub: "変化 0" },
              { label: "HMP5↓", sub: "♭9 ♭13" },
              { label: "オルタード", sub: "♭9 ♯9 ♯11 ♭13", kind: "hl" },
            ]}
            gaps={[{ label: "→" }, { label: "→" }]}
          />
          <p class="muted small">右へ行くほど緊張が強い。上の表の、色の付いたマスの数と同じ順。</p>
        </Tip>
        <Tip title="コンビネーション・ディミニッシュは規則的">
          ルートから半音・全音・半音・全音…の繰り返しの 8 音。3 フレットずらしても同じ音になるので、形が 4
          か所で使い回せる。
          <Fig caption="C の場合。半音（1）と全音（2）が交互に並び、8 音でオクターブに戻る">
            <Keys
              keys={13}
              label="C コンビネーション・ディミニッシュ：C D♭ D♯ E F♯ G A B♭"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 1, label: "♭9" },
                { semi: 3, label: "♯9" },
                { semi: 4, label: "3" },
                { semi: 6, label: "♯11" },
                { semi: 7, label: "5" },
                { semi: 9, label: "13" },
                { semi: 10, label: "♭7" },
                { semi: 12, label: "R", kind: "root" },
              ]}
              arcs={[0, 1, 3, 4, 6, 7, 9, 10].map((from, i, a) => ({
                from,
                to: a[i + 1] ?? 12,
                label: i % 2 === 0 ? "1" : "2",
                below: i % 2 === 1,
              }))}
            />
          </Fig>
          <Fig caption="いちばん低い弦の開放をルートにした場合。色の帯の 2 音の組が 3 フレットごとにくり返す">
            <DimRun />
          </Fig>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          オルタードの ♯9 を短 3 度（♭3）と取り違える。3 度（長 3 度）は別にあり、♯9
          はその半音下に「テンションとして」鳴る
          <Fig caption="C7(♯9)。D♯（♯9）と E（3）は半音となりで、両方いっしょに鳴る。E があるのでマイナーにはならない">
            <Keys
              label="C7(♯9)：C E G B♭ D♯"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 3, label: "♯9", kind: "em" },
                { semi: 4, label: "3" },
                { semi: 7, label: "5" },
                { semi: 10, label: "♭7" },
              ]}
              arcs={[{ from: 3, to: 4, label: "半音", hl: true }]}
            />
          </Fig>
          <Figs wide>
            <Fig verdict="ok" caption="3 度は E。D♯ はその上に足したテンション">
              <Steps
                items={[
                  { label: "C", sub: "R" },
                  { label: "E", sub: "3" },
                  { label: "B♭", sub: "♭7" },
                  { label: "D♯", sub: "♯9", kind: "hl" },
                ]}
              />
            </Fig>
            <Fig verdict="ng" caption="E♭ を 3 度と読むと、C7 がマイナーのコードに見えてしまう">
              <Steps
                items={[
                  { label: "C", sub: "R" },
                  { label: "E♭", sub: "♭3？", kind: "ng" },
                  { label: "B♭", sub: "♭7" },
                ]}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          メジャーへ解決する Ⅴ7 で、いきなりオルタードだけを使う。まずミクソリディアンで、基準の響きを耳に入れる
          <Steps
            label="覚える順：ミクソリディアン、HMP5↓、オルタード"
            items={[
              { label: "① ミクソ", sub: "基準", kind: "hl" },
              { label: "② HMP5↓", sub: "2 音変える" },
              { label: "③ オルタード", sub: "4 音変える" },
            ]}
          />
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>G7 → C と G7 → Cm を交互に弾き、G7 の上でミクソリディアンと HMP5↓ を弾き分ける</li>
          <li>同じフレーズの 9 だけを ♭9 に替える、13 だけを ♭13 に替える、と 1 音ずつ変えて響きの違いを聴く</li>
        </ul>
      </Section>
    </>
  );
}
