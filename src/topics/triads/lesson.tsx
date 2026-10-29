/* 参考の本文：トライアドの構成音 */
import { useContext } from "preact/hooks";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, type KeyMark, Keys, LessonBoard, type StepItem, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>トライアドは、ルートの上に 3 度を 2 つ重ねた 3 音（R・3 度・5 度）</li>
      <li>
        メジャー＝<strong>R 3 5</strong>、マイナー＝<strong>R ♭3 5</strong>。違いは 3 度の半音 1 つだけ
      </li>
      <li>音名はアルファベットを 1 つ飛ばしで並べ（C E G）、♯・♭ で高さを合わせる</li>
    </Points>
  );
}

/** C をルートにしたトライアドの鍵盤。3 つの音と、間の半音の数 */
function Triad({ name, tones, caption }: { name: string; tones: [string, number][]; caption: string }) {
  const marks: KeyMark[] = tones.map(([label, semi]) => ({ semi, label, kind: semi === 0 ? "root" : "tone" }));
  const arcs = tones.slice(1).map(([, semi], i) => ({ from: tones[i]![1], to: semi, label: `${semi - tones[i]![1]}` }));
  return (
    <Fig title={name} caption={caption}>
      <Keys marks={marks} arcs={arcs} label={`${name}：${tones.map(t => t[0]).join(" ")}`} />
    </Fig>
  );
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
/** start から 1 つ飛ばしで 3 文字を強調した文字の並び */
const skipRow = (start: number): StepItem[] =>
  Array.from({ length: 5 }, (_, i) => ({ label: LETTERS[(start + i) % 7]!, kind: i % 2 === 0 ? "hl" : "dim" }));

export function Body() {
  const { tuning } = useContext(LessonBoard);
  return (
    <>
      <Section title="仕組み">
        <p>
          3 度には、長 3 度（半音 4 つ）と短 3 度（半音 3 つ）の 2 種類がある。この 2
          つをどう重ねるかで、トライアドの型が決まる。
        </p>
        <Figs>
          <Triad
            name="C（メジャー）"
            tones={[
              ["R", 0],
              ["3", 4],
              ["5", 7],
            ]}
            caption="4 ＋ 3。明るい"
          />
          <Triad
            name="Cm（マイナー）"
            tones={[
              ["R", 0],
              ["♭3", 3],
              ["5", 7],
            ]}
            caption="3 ＋ 4。暗い"
          />
          <Triad
            name="Cdim"
            tones={[
              ["R", 0],
              ["♭3", 3],
              ["♭5", 6],
            ]}
            caption="3 ＋ 3。不安定・緊張"
          />
          <Triad
            name="Caug"
            tones={[
              ["R", 0],
              ["3", 4],
              ["♯5", 8],
            ]}
            caption="4 ＋ 4。浮いた感じ"
          />
        </Figs>
        <p class="muted small">
          弧の数字は、鍵盤（黒鍵も数える）で半音いくつ離れているか。ギターなら 1 フレット＝半音 1 つ。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">型</th>
              <th scope="col">重ね方（下から）</th>
              <th scope="col">響き</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>メジャー（R 3 5）</td>
              <td>長 3 度 ＋ 短 3 度</td>
              <td>明るい</td>
            </tr>
            <tr>
              <td>マイナー（R ♭3 5）</td>
              <td>短 3 度 ＋ 長 3 度</td>
              <td>暗い</td>
            </tr>
            <tr>
              <td>dim（R ♭3 ♭5）</td>
              <td>短 3 度 ＋ 短 3 度</td>
              <td>不安定・緊張</td>
            </tr>
            <tr>
              <td>aug（R 3 ♯5）</td>
              <td>長 3 度 ＋ 長 3 度</td>
              <td>浮いた感じ</td>
            </tr>
          </tbody>
        </table>
        <p>
          sus4（R 4 5）と sus2（R 2 5）は 3 度の代わりに 4 度・2 度を使う形で、明るくも暗くもない。sus4 は 3
          度へ戻りたがる響きで、よく元のコードの前に置かれる。
        </p>
        <Figs>
          <Triad
            name="Csus2"
            tones={[
              ["R", 0],
              ["2", 2],
              ["5", 7],
            ]}
            caption="3 度の代わりに 2 度（D）"
          />
          <Triad
            name="Csus4"
            tones={[
              ["R", 0],
              ["4", 5],
              ["5", 7],
            ]}
            caption="3 度の代わりに 4 度（F）"
          />
        </Figs>
      </Section>
      <Tips>
        <Tip title="アルファベットを 1 つ飛ばし">
          C D E F G A B を 1 つ飛ばしで 3 つ取ると、どのトライアドも文字が決まる：C E G、D F A、E G B、F A C、G B D、A C
          E、B D F。あとは型に合わせて ♯・♭ を付ける（D メジャーは D F♯ A）。
          <Steps items={skipRow(0)} label="C から 1 つ飛ばし：C E G" />
          <Steps items={skipRow(5)} label="A から 1 つ飛ばし：A C E（B の次は C に戻る）" />
          <p class="muted small">B の次は C に戻る（A C E）。</p>
        </Tip>
        <Tip title="♯・♭ なしで済むものを覚える">
          そのままでメジャーなのは C・F・G、マイナーなのは Dm・Em・Am、dim なのは Bdim。ほかはここから 1 音ずらすだけ（E
          は Em の G を G♯ に）。
          <Steps
            label="白鍵だけのトライアド"
            items={[
              { label: "C", sub: "メジャー", kind: "hl" },
              { label: "Dm", sub: "マイナー" },
              { label: "Em", sub: "マイナー" },
              { label: "F", sub: "メジャー", kind: "hl" },
              { label: "G", sub: "メジャー", kind: "hl" },
              { label: "Am", sub: "マイナー" },
              { label: "Bdim", sub: "dim" },
            ]}
          />
        </Tip>
        <Tip title="5 度は半音 7 つ（ほぼいつも同じ）">
          完全 5 度は、ルートの 7 フレット先。レギュラーチューニングなら、隣の太い弦の同じフレットか、隣の細い弦の 2
          フレット先（3 弦 → 2 弦は 3 フレット先）にも同じ音名がある。♭5 になるのは dim、♯5 になるのは aug だけ。
          {tuning.id === "standard" && (
            <Fig caption="5 弦 3 フレット（C）の 5 度（G）は、6 弦の同じフレットと、4 弦の 2 フレット先">
              <Board
                range={{ minFret: 2, maxFret: 6 }}
                orientation="horizontal"
                label="ルートと 5 度の位置"
                marks={[
                  { pos: { string: 5, fret: 3 }, kind: "root", label: "R" },
                  { pos: { string: 6, fret: 3 }, kind: "tone", label: "5" },
                  { pos: { string: 4, fret: 5 }, kind: "tone", label: "5" },
                ]}
              />
            </Fig>
          )}
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          E♭m の 3 度を F♯ と書く。文字は E の 1 つ飛ばしで G なので、G♭ と書く（音の高さは同じ）
          <Figs>
            <Fig verdict="ok" caption="文字が E・G・B（1 つ飛ばし）">
              <Steps
                items={[
                  { label: "E♭", sub: "E" },
                  { label: "G♭", sub: "G" },
                  { label: "B♭", sub: "B" },
                ]}
              />
            </Fig>
            <Fig verdict="ng" caption="文字が E・F・B で、1 つ飛ばしになっていない">
              <Steps
                items={[
                  { label: "E♭", sub: "E" },
                  { label: "F♯", sub: "F", kind: "ng" },
                  { label: "B♭", sub: "B" },
                ]}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          メジャーとマイナーを、5 度の違いだと思う。違うのは 3 度だけ
          <Fig caption="C と Cm で動くのは 3 度（E ↔ E♭）だけ。R の C と 5 度の G は同じ">
            <Keys
              label="C と Cm の違いは 3 度だけ"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 3, label: "♭3", kind: "em" },
                { semi: 4, label: "3", kind: "em" },
                { semi: 7, label: "5" },
              ]}
            />
          </Fig>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C から順に、12 のルートのメジャーとマイナーを声に出して言う（C E G、Cm は C E♭ G…）</li>
          <li>
            ギターでコードを押さえたら、各弦の音が R・3・5 のどれかを言ってみる（ローコードの参考の「度数」表示が答え）
          </li>
        </ul>
      </Section>
    </>
  );
}
