/* 参考の本文：テンションの構成音 */
import { useContext } from "preact/hooks";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, type KeyMark, Keys, LessonBoard, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>テンションは、4 和音（R 3 5 7）のさらに上に重ねる音。9・11・13 の 3 つと、その ♭・♯</li>
      <li>
        <strong>9＝2、11＝4、13＝6</strong> を 1 オクターブ上で数えたもの（C の 9 は D）
      </li>
      <li>コードの音の半音上に当たるテンションはぶつかるので使わない（アボイド）</li>
    </Points>
  );
}

const CM7: KeyMark[] = [
  { semi: 0, label: "R", kind: "root" },
  { semi: 4, label: "3" },
  { semi: 7, label: "5" },
  { semi: 11, label: "7" },
];

export function Body() {
  const { tuning } = useContext(LessonBoard);
  return (
    <>
      <Section title="仕組み">
        <p>
          4 和音の上にさらに 3 度を重ねていくと、9 度・11 度・13 度が出てくる（C E G B の上に D F
          A）。これがテンション。13 度の次は 15 度＝2 オクターブ上の R に戻るので、テンションはこの 3
          つ（と、それを半音上げ下げした音）だけ。
        </p>
        <Steps
          label="C E G B の上に D F A を重ねる"
          items={[
            { label: "C", sub: "R" },
            { label: "E", sub: "3" },
            { label: "G", sub: "5" },
            { label: "B", sub: "7" },
            { label: "D", sub: "9", kind: "hl" },
            { label: "F", sub: "11", kind: "hl" },
            { label: "A", sub: "13", kind: "hl" },
          ]}
        />
        <Fig caption="CM7 の上に 3 度ずつ重ねた音（輪）。9・11・13 は、2・4・6 の 1 オクターブ上">
          <Keys
            keys={22}
            label="CM7 の上に 9（D）・11（F）・13（A）"
            marks={[
              ...CM7,
              { semi: 14, label: "9", kind: "em" },
              { semi: 17, label: "11", kind: "em" },
              { semi: 21, label: "13", kind: "em" },
            ]}
          />
        </Fig>
        <p>
          使えるかどうかの目安は「コードの音の半音上に当たらないか」。半音上に当たると強くぶつかって、コードの響きが崩れる（アボイドノート）。
        </p>
        <Figs>
          <Fig title="CM7 ＋ 11（F）" caption="3 度の E と半音でぶつかる">
            <Keys
              label="CM7 の上の F は E の半音上"
              marks={[...CM7, { semi: 5, label: "11", kind: "em" }]}
              arcs={[{ from: 4, to: 5, label: "半音", hl: true }]}
            />
          </Fig>
          <Fig title="Cm7 ＋ 11（F）" caption="3 度が E♭ なので全音離れ、ぶつからない">
            <Keys
              label="Cm7 の上の F は E♭ の全音上"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 3, label: "♭3" },
                { semi: 7, label: "5" },
                { semi: 10, label: "♭7" },
                { semi: 5, label: "11", kind: "em" },
              ]}
              arcs={[{ from: 3, to: 5, label: "2" }]}
            />
          </Fig>
        </Figs>
        <ul>
          <li>M7（CM7）：11（F）は 3 度（E）の半音上でぶつかるので、代わりに ♯11（F♯）を使う。9・♯11・13 が使える</li>
          <li>
            7（C7）：9・13 のほか、♭9・♯9・♭13（オルタードテンション）も使える。11 は M7 と同じ理由で避け、♯11 にする
          </li>
          <li>m7（Cm7）：9・11 がよく合う。3 度が ♭3 なので 11 はぶつからない</li>
          <li>m7(♭5)：9・11・♭13</li>
        </ul>
        <p>
          ♭9・♯9・♯11・♭13 のような ♯・♭ 付きのテンションは、主にドミナントの
          7（Ⅴ7）に載せて、解決したがる緊張を強める。
        </p>
        <Fig caption="C7 に載るテンション（輪）。空いている白鍵の F（11）と B（7）だけが使わない音">
          <Keys
            label="C7 のテンション：♭9 9 ♯9 ♯11 ♭13 13"
            marks={[
              { semi: 0, label: "R", kind: "root" },
              { semi: 4, label: "3" },
              { semi: 7, label: "5" },
              { semi: 10, label: "♭7" },
              { semi: 1, label: "♭9", kind: "em" },
              { semi: 2, label: "9", kind: "em" },
              { semi: 3, label: "♯9", kind: "em" },
              { semi: 6, label: "♯11", kind: "em" },
              { semi: 8, label: "♭13", kind: "em" },
              { semi: 9, label: "13", kind: "em" },
            ]}
          />
        </Fig>
      </Section>
      <Tips>
        <Tip title="2・4・6 に 7 を足す">
          9 は 2 度＋7、11 は 4 度＋7、13 は 6 度＋7。度数の数え方が分かっていれば、テンションの音名も同じ手順で出せる。
          <Figs>
            {(
              [
                ["2", "9", "D"],
                ["4", "11", "F"],
                ["6", "13", "A"],
              ] as const
            ).map(([low, t, n]) => (
              <Fig key={t}>
                <Steps
                  items={[
                    { label: low, sub: n },
                    { label: t, sub: n, kind: "hl" },
                  ]}
                  gaps={[{ label: "+7" }]}
                />
              </Fig>
            ))}
          </Figs>
          <p class="muted small">下の字は C の場合の音名。数字が変わっても音名は同じ。</p>
        </Tip>
        <Tip title="ギターでは 5 度やルートを省いて載せる">
          6 本の弦では全部の音は押さえられない。5 度（とベースが弾くならルート）を省いて、3 度・7
          度・テンションを残す。3 度と 7 度がコードの型を決め、テンションが色を足す。
          <Steps
            label="G13：R 3 5 ♭7 9 13 から 5 と 9 を省いて R 3 ♭7 13"
            items={[
              { label: "R", sub: "G" },
              { label: "3", sub: "B" },
              { label: "5", sub: "省く", kind: "dim" },
              { label: "♭7", sub: "F" },
              { label: "9", sub: "省く", kind: "dim" },
              { label: "13", sub: "E", kind: "hl" },
            ]}
          />
          {tuning.id === "standard" && (
            <Fig caption="G13 の押さえ方（3x345x）。5 度と 9 度は省き、2 弦で 13（E）を足す">
              <Board
                range={{ minFret: 2, maxFret: 6 }}
                label="G13：6弦3 R、4弦3 ♭7、3弦4 3、2弦5 13"
                marks={[
                  { pos: { string: 6, fret: 3 }, kind: "root", label: "R" },
                  { pos: { string: 4, fret: 3 }, kind: "tone", label: "♭7" },
                  { pos: { string: 3, fret: 4 }, kind: "tone", label: "3" },
                  { pos: { string: 2, fret: 5 }, kind: "target", label: "13" },
                ]}
                muted={[5, 1]}
              />
            </Fig>
          )}
        </Tip>
        <Tip title="コード名の書き方">
          C9 は C7 に 9 を足したもの（7 も入る）。7 を入れずに 9 だけ足すときは Cadd9。C7(♭9)、C7(♯11)
          のように括弧で書く。
          <Figs wide>
            <Fig title="C9">
              <Steps
                items={[
                  { label: "C" },
                  { label: "E" },
                  { label: "G" },
                  { label: "B♭", sub: "7", kind: "hl" },
                  { label: "D", sub: "9" },
                ]}
              />
            </Fig>
            <Fig title="Cadd9">
              <Steps items={[{ label: "C" }, { label: "E" }, { label: "G" }, { label: "D", sub: "9" }]} />
            </Fig>
          </Figs>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          9 と 2、13 と 6 を別の音名だと思う。音名は同じで、1 オクターブ違うだけ
          <Fig caption="C の 2 と 9 はどちらも D。12 半音（1 オクターブ）離れているだけ">
            <Keys
              keys={15}
              label="C から数えた 2 と 9 はどちらも D"
              marks={[
                { semi: 0, label: "R", kind: "root" },
                { semi: 2, label: "2" },
                { semi: 14, label: "9", kind: "em" },
              ]}
              arcs={[{ from: 2, to: 14, label: "1 オクターブ上", below: true }]}
            />
          </Fig>
        </li>
        <li>
          CM7 に 11（F）を載せてにごる。M7 では ♯11
          <Figs>
            <Fig verdict="ok" caption="♯11（F♯）は 3 度の E から全音">
              <Keys
                label="CM7 に ♯11"
                marks={[...CM7, { semi: 6, label: "♯11", kind: "em" }]}
                arcs={[{ from: 4, to: 6, label: "2" }]}
              />
            </Fig>
            <Fig verdict="ng" caption="11（F）は 3 度の E の半音上">
              <Keys
                label="CM7 に 11"
                marks={[...CM7, { semi: 5, label: "11", kind: "em" }]}
                arcs={[{ from: 4, to: 5, label: "1", hl: true }]}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          C9 に 7 度が入っていることを忘れる（C9＝C E G B♭ D）
          <Figs wide>
            <Fig verdict="ok" caption="C9：7 度の B♭ も入る">
              <Steps
                items={[{ label: "C" }, { label: "E" }, { label: "G" }, { label: "B♭", kind: "hl" }, { label: "D" }]}
              />
            </Fig>
            <Fig verdict="ng" caption="B♭ が無いと Cadd9 になる">
              <Steps items={[{ label: "C" }, { label: "E" }, { label: "G" }, { label: "D", kind: "ng" }]} />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>G7 を押さえて、5 度の代わりに 13（E）、ルートの代わりに 9（A）を足し、響きの違いを聴く</li>
          <li>表の各コードで、C の場合のテンションの音名を言う（CM7 の ♯11 は F♯、C7 の ♭13 は A♭）</li>
        </ul>
      </Section>
    </>
  );
}
