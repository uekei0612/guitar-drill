/* 参考の本文：指板の音名 */
import { useContext } from "preact/hooks";
import type { Mark } from "../../drill/topic";
import { stringCount } from "../../theory";
import { HScroll } from "../../ui/HScroll";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, Keys, LessonBoard, SomeStrings, nameAt, stringRun } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>1 フレット進むと半音 1 つ上がる。12 フレットで 1 オクターブ上の同じ音名に戻る</li>
      <li>
        自然音は <strong>C D E F G A B</strong>。隣どうしは全音（2 フレット）で、<strong>E–F と B–C だけが半音</strong>
        （隣のフレット）
      </li>
      <li>まず 6 弦と 5 弦を覚える（コードやスケールのルートを探す基準になる）</li>
    </Points>
  );
}

/** C から次の C までの白鍵の間（全音・半音） */
const WHITE = [0, 2, 4, 5, 7, 9, 11, 12];
const STEP_ARCS = WHITE.slice(1).map((to, i) => {
  const half = to - WHITE[i]! === 1;
  return { from: WHITE[i]!, to, label: half ? "半" : "全", hl: half };
});

/** 6 弦と 5 弦の目印（ハイコードの参考でも使う） */
export function Landmarks() {
  const { tuning: t } = useContext(LessonBoard);
  const marks: Mark[] = [6, 5].flatMap(string =>
    [0, 3, 5, 7, 8, 10, 12].map(fret => ({
      pos: { string, fret },
      kind: fret === 0 || fret === 12 ? ("root" as const) : ("tone" as const),
      label: nameAt(t, { string, fret }),
    })),
  );
  const { lefty } = useContext(LessonBoard);
  return (
    <Fig caption="6 弦と 5 弦の目印（点のあるフレットの近く）。横にスクロールできる">
      <HScroll startAtEnd={lefty}>
        <SomeStrings
          strings={[6, 5]}
          range={{ minFret: 0, maxFret: 12 }}
          orientation="horizontal"
          scale={1}
          label="6 弦と 5 弦の目印"
          marks={marks}
        />
      </HScroll>
    </Fig>
  );
}

export function Body({ standard }: { standard: boolean }) {
  const { tuning: t, lefty } = useContext(LessonBoard);
  const low = stringCount(t);
  return (
    <>
      <Section title="仕組み">
        <p>
          音名は C から順に C D E F G A B の 7 つ（自然音、ピアノの白鍵）。その間に ♯・♭ の付く音（黒鍵）が 5
          つあって、全部で 12 音。<strong>E と F、B と C の間には黒鍵が無い</strong>
          ので、ここだけ 1 フレットで隣の音名になる。
        </p>
        <Fig caption="白鍵どうしは、間に黒鍵があれば全音（2 フレット）、無ければ半音（1 フレット）。半音はオレンジの 2 か所だけ">
          <Keys keys={13} arcs={STEP_ARCS} label="C から C までの鍵盤。E と F、B と C の間だけ半音" />
        </Fig>
        <p>
          ギターの 1 本の弦は、この鍵盤を 1 列に並べたものと同じ。1 フレット＝鍵盤の隣の鍵（黒鍵も数える）。♯
          は半音上げ、♭ は半音下げで、2 フレット離れた自然音の間の音は 2 つの名前を持つ（F と G の間は F♯ でも G♭
          でもある）。
        </p>
        <Fig caption={`${low} 弦の 0〜12 フレット。薄い点が黒鍵の音（♯・♭）。12 フレットで開放と同じ音名に戻る`}>
          <HScroll startAtEnd={lefty}>
            <SomeStrings
              strings={[low]}
              range={{ minFret: 0, maxFret: 12 }}
              orientation="horizontal"
              scale={1}
              label={`${low}弦の 0〜12 フレット`}
              marks={stringRun(t, low, 0, 12)}
            />
          </HScroll>
        </Fig>
      </Section>
      {standard ? (
        <Tips>
          <Tip title="目印のフレットから数える">
            6 弦は 0=E・3=G・5=A・7=B・8=C・10=D・12=E。5 弦は
            0=A・3=C・5=D・7=E・8=F・10=G・12=A。指板の点（ポジションマーク）のある 3・5・7・9・12
            フレットを足場にして、そこから 1〜2 フレット数える。
            <Landmarks />
          </Tip>
          <Tip title="6 弦と 1 弦は同じ">
            1 弦は 6 弦と同じ並び（2 オクターブ上）。6 弦を覚えれば 1 弦も分かる。
            <Fig caption="上（1 弦）と下（6 弦）が同じ並び">
              <Board
                range={{ minFret: 0, maxFret: 5 }}
                label="6 弦と 1 弦の 0〜5 フレット"
                marks={[...stringRun(t, 6, 0, 5), ...stringRun(t, 1, 0, 5)]}
              />
            </Fig>
          </Tip>
          <Tip title="オクターブの形で 2 弦先へ飛ぶ">
            同じ音名の 1 オクターブ上は、<strong>2 本細い弦の 2 フレット先</strong>（6 弦 → 4 弦、5 弦 → 3 弦）。3 弦と
            2 弦の間で並びが 1 つずれるので、<strong>4 弦 → 2 弦と 3 弦 → 1 弦は 3 フレット先</strong>。
            <Fig caption="G（オレンジ）：6 弦 3 → 4 弦 5（2 フレット先）→ 2 弦 8（3 フレット先）。C も同じ形で 5 弦 3 → 3 弦 5 → 1 弦 8">
              <Board
                range={{ minFret: 3, maxFret: 8 }}
                orientation="horizontal"
                label="オクターブの形"
                marks={[
                  { pos: { string: 6, fret: 3 }, kind: "root", label: "G" },
                  { pos: { string: 4, fret: 5 }, kind: "root", label: "G" },
                  { pos: { string: 2, fret: 8 }, kind: "root", label: "G" },
                  { pos: { string: 5, fret: 3 }, kind: "tone", label: "C" },
                  { pos: { string: 3, fret: 5 }, kind: "tone", label: "C" },
                  { pos: { string: 1, fret: 8 }, kind: "tone", label: "C" },
                ]}
              />
            </Fig>
          </Tip>
          <Tip title="隣の細い弦なら 5 フレット手前">
            6 弦 8 フレット（C）は、5 弦 3 フレット（C）と同じ高さ。隣の細い弦の 5 フレット手前に同じ音がある（3 弦 → 2
            弦だけは 4 フレット手前）。
            <Fig caption="6 弦 8 と 5 弦 3 は同じ C（同じ高さ）">
              <Board
                range={{ minFret: 3, maxFret: 8 }}
                orientation="horizontal"
                label="隣の弦の同じ音"
                marks={[
                  { pos: { string: 6, fret: 8 }, kind: "root", label: "C" },
                  { pos: { string: 5, fret: 3 }, kind: "root", label: "C" },
                ]}
              />
            </Fig>
          </Tip>
        </Tips>
      ) : (
        <StandardOnly />
      )}
      <Pitfalls>
        <li>
          E–F・B–C も 2 フレット空けてしまう（E の 1 フレット上はもう F）
          {standard && (
            <Figs wide>
              <Fig verdict="ok" caption="E の隣が F">
                <SomeStrings
                  strings={[low]}
                  range={{ minFret: 0, maxFret: 3 }}
                  label="E の 1 フレット上が F"
                  marks={stringRun(t, low, 0, 3)}
                />
              </Fig>
              <Fig verdict="ng" caption="2 フレット上は F♯">
                <SomeStrings
                  strings={[low]}
                  range={{ minFret: 0, maxFret: 3 }}
                  label="E の 2 フレット上を F と間違える"
                  marks={[
                    { pos: { string: low, fret: 0 }, kind: "tone", label: nameAt(t, { string: low, fret: 0 }) },
                    { pos: { string: low, fret: 2 }, kind: "target", label: "F?" },
                  ]}
                />
              </Fig>
            </Figs>
          )}
        </li>
        <li>
          12 フレットより上で数え直す。12 を引けば、開放からと同じ並び（15 フレット＝3 フレット）
          <Figs wide>
            <Fig caption="3 フレット">
              <SomeStrings
                strings={[low]}
                range={{ minFret: 0, maxFret: 3 }}
                label="3 フレットの音"
                marks={[{ pos: { string: low, fret: 3 }, kind: "root", label: nameAt(t, { string: low, fret: 3 }) }]}
              />
            </Fig>
            <Fig caption="15 フレット（15 − 12 ＝ 3）">
              <SomeStrings
                strings={[low]}
                range={{ minFret: 12, maxFret: 15 }}
                label="15 フレットの音"
                marks={[{ pos: { string: low, fret: 15 }, kind: "root", label: nameAt(t, { string: low, fret: 15 }) }]}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>「今日は C」のように 1 つの音名を決め、6 弦から 1 弦まで全部の C を探して弾く</li>
          <li>弾きながら音名を声に出す。指の位置と名前を一緒に覚える</li>
          <li>このドリルの範囲の設定で、弦を 6・5 弦に絞って始め、慣れたら弦を増やす</li>
        </ul>
      </Section>
    </>
  );
}
