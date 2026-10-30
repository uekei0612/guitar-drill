/* 参考の本文：度数の位置 */
import { useContext } from "preact/hooks";
import type { Mark } from "../../drill/topic";
import { stringCount } from "../../theory";
import { HScroll } from "../../ui/HScroll";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, Keys, LessonBoard, SomeStrings } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>度数は、ルート（R）から何番目の音か。半音の数で高さが決まる（3 度＝半音 4 つ、5 度＝半音 7 つ）</li>
      <li>指板では、ルートからの度数の「形」はどのフレットでも同じ。形で覚えれば、キーが変わっても使える</li>
      <li>3 弦と 2 弦をまたぐときだけ、形が 1 フレットずれる</li>
    </Points>
  );
}

const SEMIS: readonly [string, number, string][] = [
  ["♭2", 1, "短 2 度"],
  ["2", 2, "長 2 度"],
  ["♭3", 3, "短 3 度"],
  ["3", 4, "長 3 度"],
  ["4", 5, "完全 4 度"],
  ["♭5", 6, "減 5 度（増 4 度）"],
  ["5", 7, "完全 5 度"],
  ["♭6", 8, "短 6 度"],
  ["6", 9, "長 6 度"],
  ["♭7", 10, "短 7 度"],
  ["7", 11, "長 7 度"],
  ["8", 12, "オクターブ"],
];

const p = (string: number, fret: number) => ({ string, fret });
/** 図の点。R はオレンジ、ほかは度数を書いた黒い点（hint は薄く、target は輪） */
const m = (string: number, fret: number, label: string, kind: Mark["kind"] = "tone"): Mark => ({
  pos: p(string, fret),
  kind: label === "R" ? "root" : kind,
  label,
});

/** レギュラーチューニングの度数の形（ルートは 6 弦 5 フレット） */
function Shape({
  marks,
  range,
  label,
  caption,
}: {
  marks: Mark[];
  range: [number, number];
  label: string;
  caption: string;
}) {
  return (
    <Fig caption={caption}>
      <Board range={{ minFret: range[0], maxFret: range[1] }} orientation="horizontal" label={label} marks={marks} />
    </Fig>
  );
}

export function Body({ standard }: { standard: boolean }) {
  const { tuning: t, lefty } = useContext(LessonBoard);
  const low = stringCount(t);
  const run: Mark[] = [["R", 0] as const, ...SEMIS.map(([d, n]) => [d, n] as const)].map(([d, n]) => ({
    pos: p(low, n),
    kind: d === "R" || d === "8" ? "root" : d.startsWith("♭") ? "hint" : "tone",
    label: d,
  }));
  return (
    <>
      <Section title="仕組み">
        <p>
          度数は音の名前ではなく、ルートからの距離。同じ弦の上なら、ルートから何フレット先かがそのまま半音の数になる。
        </p>
        <Fig
          caption={`${low} 弦の開放をルートにしたとき。1 フレット＝半音 1 つで、12 フレット先がオクターブ（8）。薄い点が ♭ の付く度数`}
        >
          <HScroll startAtEnd={lefty}>
            <SomeStrings
              strings={[low]}
              range={{ minFret: 0, maxFret: 12 }}
              orientation="horizontal"
              scale={1}
              label="同じ弦の上の度数"
              marks={run}
            />
          </HScroll>
        </Fig>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">度数</th>
              <th scope="col">半音（同じ弦のフレット）</th>
              <th scope="col">名前</th>
            </tr>
          </thead>
          <tbody>
            {SEMIS.map(([d, n, name]) => (
              <tr key={d}>
                <td>{d}</td>
                <td>{n}</td>
                <td>{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          ただ、同じ弦の上だけで数えると手が大きく動く。実際には隣の弦へ移って、近いフレットで度数を探す（下の「覚え方のコツ」）。
        </p>
      </Section>
      {standard ? (
        <Tips>
          <Tip title="隣の細い弦へ（6→5、5→4、4→3 弦）">
            同じフレットが 4 度、2 フレット先が 5 度、1 フレット手前が 3 度、2 フレット手前が
            ♭3。ルートのすぐ上の弦に、3 度・4 度・5 度が並ぶ。
            <Shape
              range={[2, 8]}
              label="隣の細い弦の度数"
              caption="6 弦 5 フレットの R から見た、5 弦の ♭3・3・4・5"
              marks={[m(6, 5, "R"), m(5, 3, "♭3", "hint"), m(5, 4, "3"), m(5, 5, "4"), m(5, 7, "5")]}
            />
          </Tip>
          <Tip title="2 本細い弦へ（6→4、5→3 弦）">
            同じフレットが ♭7、1 フレット先が 7、2 フレット先がオクターブ（8）、1 フレット手前が 6。
            <Shape
              range={[3, 8]}
              label="2 本細い弦の度数"
              caption="6 弦 5 フレットの R から見た、4 弦の 6・♭7・7・8"
              marks={[m(6, 5, "R"), m(4, 4, "6"), m(4, 5, "♭7", "hint"), m(4, 6, "7"), m(4, 7, "8")]}
            />
          </Tip>
          <Tip title="3 弦と 2 弦の間は 1 フレットずらす">
            3 弦（G）と 2 弦（B）は長 3 度しか離れていない。形が 2 弦・1 弦にかかるときは、その部分を 1
            フレット先へずらす（4 弦 → 2 弦のオクターブが 3 フレット先になるのはこのため）。
            <Shape
              range={[3, 8]}
              label="オクターブの位置"
              caption="6 弦 → 4 弦のオクターブは 2 フレット先。4 弦 → 2 弦は 3 フレット先（輪）"
              marks={[m(6, 3, "R"), m(4, 5, "8"), m(2, 8, "8", "target")]}
            />
          </Tip>
          <Tip title="パワーコードの形を基準に">
            6 弦のルート、5 弦の 2 フレット先（5 度）、4 弦の 2
            フレット先（オクターブ）。この「R・5・8」の形を足場にして、ほかの度数を 1〜2 フレットの差で覚える。
            <Shape
              range={[3, 8]}
              label="パワーコードの形と、そこからの度数"
              caption="R・5・8 の形（濃い点）から、1 フレット手前の 3 と ♭7（薄い点）"
              marks={[m(6, 5, "R"), m(5, 7, "5"), m(4, 7, "8"), m(5, 4, "3", "hint"), m(4, 5, "♭7", "hint")]}
            />
          </Tip>
        </Tips>
      ) : (
        <StandardOnly />
      )}
      <Pitfalls>
        <li>
          3 度と ♭3 を取り違える。長 3 度は全音 2 つ（4 フレット）、短 3 度は全音＋半音（3 フレット）
          <Figs wide>
            <Fig caption="C から E♭ は半音 3 つ（♭3）、E は半音 4 つ（3）">
              <Keys
                label="R から ♭3 と 3 までの半音の数"
                marks={[
                  { semi: 0, label: "R", kind: "root" },
                  { semi: 3, label: "♭3" },
                  { semi: 4, label: "3", kind: "em" },
                ]}
                arcs={[
                  { from: 0, to: 3, label: "3" },
                  { from: 0, to: 4, label: "4", below: true, hl: true },
                ]}
              />
            </Fig>
            <Fig caption="同じ弦なら ♭3 は 3 フレット先、3 は 4 フレット先">
              <SomeStrings
                strings={[low]}
                range={{ minFret: 0, maxFret: 5 }}
                orientation="horizontal"
                label="同じ弦の ♭3 と 3"
                marks={[m(low, 0, "R"), m(low, 3, "♭3", "hint"), m(low, 4, "3", "target")]}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          2 弦・1 弦の上で、ずらし忘れる（上の「1 フレットずらす」）
          {standard && (
            <Figs wide>
              <Fig verdict="ok" caption="4 弦 → 2 弦のオクターブは 3 フレット先">
                <Board
                  range={{ minFret: 4, maxFret: 8 }}
                  orientation="horizontal"
                  label="4 弦の R と 2 弦のオクターブ"
                  marks={[m(4, 5, "R"), m(2, 8, "8", "ok")]}
                />
              </Fig>
              <Fig verdict="ng" caption="6 弦 → 4 弦と同じ 2 フレット先にすると、7（半音低い）">
                <Board
                  range={{ minFret: 4, maxFret: 8 }}
                  orientation="horizontal"
                  label="ずらし忘れた 2 弦の音"
                  marks={[m(4, 5, "R"), m(2, 7, "7", "wrong")]}
                />
              </Fig>
            </Figs>
          )}
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>6 弦か 5 弦にルートを決め、R → 3 → 5 → 8 と度数を言いながら弾く。次に ♭3・♭7 を足す</li>
          <li>ルートを 1 フレットずつ動かして同じことをする（形が変わらないことを手で確かめる）</li>
        </ul>
      </Section>
    </>
  );
}
