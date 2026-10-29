/* 参考の本文：開放弦の音名 */
import { useContext } from "preact/hooks";
import type { Mark } from "../../drill/topic";
import { fmt, openMidis, stringCount } from "../../theory";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, LessonBoard, SomeStrings, StringOrder, Steps, stringRun } from "../../ui/LessonFigures";

export function Intro({ standard }: { standard: boolean }) {
  return (
    <Points>
      <li>弦は細い順に 1 弦〜6 弦と数える。いちばん太い（音の低い）弦が 6 弦</li>
      {standard ? (
        <li>
          レギュラーチューニングは 6 弦から <strong>E A D G B E</strong>（ミ ラ レ ソ シ ミ）
        </li>
      ) : (
        <li>今の設定のチューニングの開放弦は、下の図と表のとおり</li>
      )}
      <li>開放弦の音名は、指板のすべての音を数える出発点になる</li>
    </Points>
  );
}

/** 5 フレットの音＝1 本細い弦の開放（3 弦だけ 4 フレット）。チューニングを合わせるときの図 */
const FIFTH_FRET: Mark[] = [
  ...(
    [
      [6, 5, "A"],
      [5, 5, "D"],
      [4, 5, "G"],
      [2, 5, "E"],
    ] as const
  ).map(([string, fret, label]) => ({ pos: { string, fret }, kind: "tone" as const, label })),
  { pos: { string: 3, fret: 4 }, kind: "root", label: "B" },
  ...(
    [
      [5, "A"],
      [4, "D"],
      [3, "G"],
      [2, "B"],
      [1, "E"],
    ] as const
  ).map(([string, label]) => ({ pos: { string, fret: 0 }, kind: "open" as const, label })),
];

export function Body({ standard }: { standard: boolean }) {
  const { tuning: t } = useContext(LessonBoard);
  const n = stringCount(t);
  const low = n;
  const midis = openMidis(t);
  // 6 弦 → 1 弦の順の開放弦と、隣どうしの半音の数
  const names = t.open.map(fmt);
  const gaps = midis.slice(1).map((m, i) => m - midis[i]!);
  return (
    <>
      <Section title="仕組み">
        <p>
          開放弦は、どこも押さえずに鳴らした音。フレットを 1
          つ押さえるごとに半音ずつ高くなるので、開放弦の音名が分かれば、そこから数えて指板のどの音でも分かる。
        </p>
        <Fig caption={`${low} 弦を開放から 1 フレットずつ。1 フレット進むごとに半音 1 つ上がる（薄い点は ♯ の付く音）`}>
          <SomeStrings
            strings={[low]}
            range={{ minFret: 0, maxFret: 5 }}
            label={`${low}弦の 0〜5 フレット`}
            marks={stringRun(t, low, 0, 5)}
          />
        </Fig>
        <p>隣り合う弦が、半音いくつ離れているか（太い弦 → 細い弦）：</p>
        <Steps
          label="隣の弦との半音の差"
          items={names.map((label, i) => ({ label, sub: `${n - i}弦` }))}
          gaps={gaps.map(g => ({ label: `${g}`, hl: g !== 5 }))}
        />
        {standard && (
          <p>
            ほとんどが半音 5 つ（4 度）。<strong>3 弦（G）と 2 弦（B）の間だけが半音 4 つ</strong>
            で、ここでだけ並びがずれる。このずれは、あとで習うオクターブの形やスケールの形にも出てくる。
          </p>
        )}
      </Section>
      {standard ? (
        <Tips>
          <Tip title="両端は同じ E">
            1 弦と 6 弦はどちらも E（2 オクターブ違い）。覚えるのは間の 4 つ（A D G B）だけ。
            <Fig caption="オレンジの 2 本（外側）が E。覚えるのは内側の 4 本">
              <Board
                range={{ minFret: 0, maxFret: 2 }}
                label="開放弦。1 弦と 6 弦が E"
                marks={names.map((label, i) => ({
                  pos: { string: n - i, fret: 0 },
                  kind: label === "E" ? ("openRoot" as const) : ("open" as const),
                  label,
                }))}
              />
            </Fig>
          </Tip>
          <Tip title="語呂で覚える">
            英語圏の定番は「Eat A Dog, Good Bye Eddie」。頭文字が 6
            弦からの音名になっている。日本語なら「ミ・ラ・レ・ソ・シ・ミ」と声に出して何度か弾くのが早い。
            <Steps
              items={[
                { label: "E", sub: "Eat" },
                { label: "A", sub: "A" },
                { label: "D", sub: "Dog" },
                { label: "G", sub: "Good" },
                { label: "B", sub: "Bye" },
                { label: "E", sub: "Eddie" },
              ]}
            />
          </Tip>
          <Tip title="5 フレットは次の弦の開放">
            6 弦の 5 フレットは、5 弦の開放と同じ A。同じように 5 弦 5 フレット＝D、4 弦 5 フレット＝G。
            <strong>3 弦だけは 4 フレット</strong>で 2 弦の開放（B）になる。チューニングを合わせるときにも使う関係。
            <Fig caption="同じ字どうしが同じ高さの音。オレンジの 3 弦だけが 4 フレット">
              <Board range={{ minFret: 0, maxFret: 5 }} label="5 フレットと次の弦の開放" marks={FIFTH_FRET} />
            </Fig>
          </Tip>
        </Tips>
      ) : (
        <StandardOnly />
      )}
      <Pitfalls>
        <li>
          「1 弦」は構えたときに<strong>いちばん下</strong>にある細い弦。TAB 譜やこのアプリの横向きの図は、逆に 1
          弦が上になる
          <Figs>
            <Fig caption="構えて上から見下ろすと、6 弦が上">
              <StringOrder top={6} label="構えたときの弦の並び。6 弦が上" />
            </Fig>
            <Fig caption="TAB 譜・横向きの図では、1 弦が上">
              <StringOrder top={1} label="TAB 譜の弦の並び。1 弦が上" />
            </Fig>
          </Figs>
        </li>
        <li>
          開放の音名と、その弦の 12 フレットの音名は同じ（1 オクターブ上）。別の音と思わない
          <Figs>
            <Fig caption="開放">
              <Board
                range={{ minFret: 0, maxFret: 2 }}
                label="開放弦の音名"
                marks={names.map((label, i) => ({ pos: { string: n - i, fret: 0 }, kind: "open" as const, label }))}
              />
            </Fig>
            <Fig caption="12 フレット（同じ並び）">
              <Board
                range={{ minFret: 12, maxFret: 14 }}
                label="12 フレットの音名"
                marks={names.map((label, i) => ({ pos: { string: n - i, fret: 12 }, kind: "tone" as const, label }))}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>開放弦を 6 弦から順に鳴らしながら、音名を声に出す。慣れたら 1 弦から逆に</li>
          <li>弦の番号をでたらめに言ってもらい（または自分で決め）、すぐ音名を答える</li>
        </ul>
      </Section>
    </>
  );
}
