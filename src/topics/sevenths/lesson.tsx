/* 参考の本文：4和音の構成音 */
import { useContext } from "preact/hooks";
import { stringCount } from "../../theory";
import { HScroll } from "../../ui/HScroll";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import {
  ChordKeys,
  Fig,
  Figs,
  Keys,
  LessonBoard,
  SomeStrings,
  type StepItem,
  Steps,
  nameAt,
} from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>4 和音は、トライアドにもう 1 つ 3 度を重ねて 7 度を足した 4 音</li>
      <li>
        7 度は 2 種類：<strong>長 7 度（7）＝ルートの半音下</strong>、<strong>短 7 度（♭7）＝ルートの全音下</strong>
      </li>
      <li>
        基本の 4 つ：<strong>M7（R 3 5 7）・7（R 3 5 ♭7）・m7（R ♭3 5 ♭7）・m7(♭5)（R ♭3 ♭5 ♭7）</strong>
      </li>
    </Points>
  );
}

/** C をルートにした 4 和音（[度数, C からの半音]） */
const T = {
  M7: [
    ["R", 0],
    ["3", 4],
    ["5", 7],
    ["7", 11],
  ],
  "7": [
    ["R", 0],
    ["3", 4],
    ["5", 7],
    ["♭7", 10],
  ],
  m7: [
    ["R", 0],
    ["♭3", 3],
    ["5", 7],
    ["♭7", 10],
  ],
  m7b5: [
    ["R", 0],
    ["♭3", 3],
    ["♭5", 6],
    ["♭7", 10],
  ],
  dim7: [
    ["R", 0],
    ["♭3", 3],
    ["♭5", 6],
    ["♭♭7", 9],
  ],
} as const;

/** アルファベットを 1 つ飛ばしで 4 つ */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const skip4 = (start: number): StepItem[] =>
  Array.from({ length: 7 }, (_, i) => ({ label: LETTERS[(start + i) % 7]!, kind: i % 2 === 0 ? "hl" : "dim" }));

export function Body() {
  const { tuning: t, lefty } = useContext(LessonBoard);
  const low = stringCount(t);
  return (
    <>
      <Section title="仕組み">
        <p>
          名前は「トライアドの型 ＋ 7 度の種類」で読む。M（メジャー）が付くのは 7 度が長 7
          度のとき、何も付かない「7」は短 7 度。トライアド部分のマイナーの m と、7 度の M を混同しない。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">記号</th>
              <th scope="col">読み</th>
              <th scope="col">トライアド ＋ 7 度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CM7（Cmaj7・C△7）</td>
              <td>メジャーセブンス</td>
              <td>メジャー ＋ 長 7 度</td>
            </tr>
            <tr>
              <td>C7</td>
              <td>セブンス（ドミナントセブンス）</td>
              <td>メジャー ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cm7</td>
              <td>マイナーセブンス</td>
              <td>マイナー ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cm7(♭5)（Cø）</td>
              <td>マイナーセブンスフラットファイブ</td>
              <td>dim ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cdim7（C°7）</td>
              <td>ディミニッシュセブンス</td>
              <td>dim ＋ 減 7 度（♭♭7＝6 と同じ高さ）</td>
            </tr>
            <tr>
              <td>CmM7</td>
              <td>マイナーメジャーセブンス</td>
              <td>マイナー ＋ 長 7 度</td>
            </tr>
          </tbody>
        </table>
        <Figs>
          <ChordKeys name="CM7" tones={T.M7} em={[11]} caption="メジャー ＋ 長 7 度（B）" />
          <ChordKeys name="C7" tones={T["7"]} em={[10]} caption="メジャー ＋ 短 7 度（B♭）" />
          <ChordKeys name="Cm7" tones={T.m7} em={[10]} caption="マイナー ＋ 短 7 度" />
          <ChordKeys name="Cm7(♭5)" tones={T.m7b5} em={[10]} caption="dim ＋ 短 7 度" />
        </Figs>
        <p class="muted small">
          輪が 7 度。弧の数字は隣の音との半音の数で、4 つの音は 3 度（半音 3 か 4）ずつ積み重なっている。
        </p>
        <p>6・m6 は 7 度の代わりに 6 度を足した形（C6＝C E G A）。7sus4 は sus4 に短 7 度を足した形（C F G B♭）。</p>
        <p>
          メジャーキーの中のコード（ダイアトニックコード）は、基本の 4 つでできている：ⅠM7 Ⅱm7 Ⅲm7 ⅣM7 Ⅴ7 Ⅵm7
          Ⅶm7(♭5)。だからこの 4 つをまず確実にする。
        </p>
      </Section>
      <Tips>
        <Tip title="7 度は上ではなく下から数える">
          長 7 度は半音 11 個上＝ルートの半音下、短 7 度は半音 10 個上＝ルートの全音下。C なら B（M7）と
          B♭（7）。フレットでも、ルートの 1・2 フレット手前（オクターブ上なら 11・10 フレット先）。
          <Fig caption="上の C から数えると、B は半音 1 つ下、B♭ は全音（半音 2 つ）下">
            <Keys
              keys={13}
              label="上の C から見た 7 と ♭7"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 10, label: "♭7" },
                { semi: 11, label: "7" },
                { semi: 12, label: "R", kind: "root" },
              ]}
              arcs={[
                { from: 12, to: 11, label: "1", hl: true },
                { from: 12, to: 10, label: "2", below: true },
              ]}
            />
          </Fig>
          <Fig caption={`${low} 弦 12 フレット（R）の 1 つ手前が 7、2 つ手前が ♭7`}>
            <SomeStrings
              strings={[low]}
              range={{ minFret: 8, maxFret: 12 }}
              orientation="horizontal"
              label="ルートの手前の 7 と ♭7"
              marks={[
                { pos: { string: low, fret: 12 }, kind: "root", label: "R" },
                { pos: { string: low, fret: 11 }, kind: "target", label: "7" },
                { pos: { string: low, fret: 10 }, kind: "tone", label: "♭7" },
              ]}
            />
          </Fig>
        </Tip>
        <Tip title="4 つの文字も 1 つ飛ばし">
          トライアドと同じく、アルファベットを 1 つ飛ばしで 4 つ：C E G B、D F A C、G B D F。G7 は ♯・♭ なしで G B D F。
          <Steps items={skip4(0)} label="C から 1 つ飛ばしで 4 つ：C E G B" />
          <Steps items={skip4(4)} label="G から 1 つ飛ばしで 4 つ：G B D F" />
        </Tip>
        <Tip title="dim7 は 3 フレットごとに同じ形">
          dim7 は短 3 度だけを重ねた形なので、音が 3 フレットずつ等間隔に並ぶ。Cdim7・E♭dim7・G♭dim7・Adim7 は同じ 4
          音。
          <Fig caption="Cdim7：どの音の間も半音 3 つ。次の C までも 3">
            <Keys
              keys={13}
              label="Cdim7 の音は半音 3 つずつ"
              marks={[
                { semi: 0, label: "C", kind: "root" },
                { semi: 3, label: "E♭" },
                { semi: 6, label: "G♭" },
                { semi: 9, label: "A" },
                { semi: 12, label: "C", kind: "root" },
              ]}
              arcs={[0, 3, 6, 9].map(from => ({ from, to: from + 3, label: "3" }))}
            />
          </Fig>
          <Fig caption={`${low} 弦なら 3 フレットおき。どの点をルートにしても同じ 4 音`}>
            <HScroll startAtEnd={lefty}>
              <SomeStrings
                strings={[low]}
                range={{ minFret: 0, maxFret: 12 }}
                orientation="horizontal"
                scale={1}
                label="dim7 は 3 フレットおき"
                marks={[0, 3, 6, 9, 12].map(fret => ({
                  pos: { string: low, fret },
                  kind: fret % 12 === 0 ? "root" : "tone",
                  label: nameAt(t, { string: low, fret }),
                }))}
              />
            </HScroll>
          </Fig>
        </Tip>
        <Tip title="7th（ドミナント）は解決したがる">
          C7 の 3 度（E）と ♭7（B♭）は、半音 6 つ（増 4 度）離れていて不安定。次の F
          へ進むと落ち着く。響きでも区別できるようにする。
          <Fig caption="C7 の 3 度（E）と ♭7（B♭）が半音ずつ動いて、F の F と A に落ち着く">
            <Keys
              label="C7 の E と B♭ が、F の F と A へ"
              marks={[
                { semi: 4, label: "3", kind: "em" },
                { semi: 5, label: "F", kind: "root" },
                { semi: 9, label: "A" },
                { semi: 10, label: "♭7", kind: "em" },
              ]}
              arcs={[
                { from: 4, to: 10, label: "6" },
                { from: 4, to: 5, label: "↑", below: true, hl: true },
                { from: 10, to: 9, label: "↓", below: true, hl: true },
              ]}
            />
          </Fig>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          C7 を「C メジャーセブンス」と読む。M の付かない 7 は短 7 度（B♭）
          <Figs>
            <ChordKeys name="C7" tones={T["7"]} em={[10]} verdict="ok" caption="7 度は B♭（ルートの全音下）" />
            <ChordKeys name="C7 に B を入れる" tones={T.M7} em={[11]} verdict="ng" caption="B を入れると CM7 になる" />
          </Figs>
        </li>
        <li>
          Cm7 の m を 7 度のことだと思う。m はトライアド（3 度）がマイナーという意味
          <Steps
            label="Cm7 の読み方"
            items={[
              { label: "C", sub: "ルート" },
              { label: "m", sub: "3 度が ♭3", kind: "hl" },
              { label: "7", sub: "♭7 を足す" },
            ]}
          />
          <Steps
            label="CM7 の読み方"
            items={[
              { label: "C", sub: "ルート" },
              { label: "M7", sub: "長 7 度を足す", kind: "hl" },
            ]}
          />
        </li>
        <li>
          dim7 の 7 度を ♭7 と書く。dim7 は ♭♭7（C なら B♭♭）で、m7(♭5) とは 7 度が違う
          <Figs>
            <ChordKeys name="Cm7(♭5)" tones={T.m7b5} em={[10]} caption="7 度は ♭7（B♭）" />
            <ChordKeys name="Cdim7" tones={T.dim7} em={[9]} caption="7 度は ♭♭7（B♭♭＝A と同じ高さ）" />
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>1 つのルート（たとえば G）で、基本の 4 つを続けて言う：G B D F♯、G B D F、G B♭ D F、G B♭ D♭ F</li>
          <li>ギターで押さえるときは、どの弦が 7 度かを探す。7 度の 1 音を替えるだけで M7 ↔ 7 が切り替わる</li>
        </ul>
      </Section>
    </>
  );
}
