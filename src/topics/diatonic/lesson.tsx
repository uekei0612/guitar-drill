/* 参考の本文：ダイアトニックコード */
import { Fragment } from "preact";
import { type DiatonicChord, type Key, diatonicChords, fmt, mod, note, pc } from "../../theory";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, Keys, type StepItem, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>ダイアトニックコードは、キーのスケールの音だけで、各音の上に 3 度を重ねて作った 7 つのコード</li>
      <li>
        メジャーキーの並びはどのキーでも同じ：<strong>Ⅰ Ⅱm Ⅲm Ⅳ Ⅴ Ⅵm Ⅶm(♭5)</strong>
        （4 和音なら ⅠM7 Ⅱm7 Ⅲm7 ⅣM7 Ⅴ7 Ⅵm7 Ⅶm7(♭5)）
      </li>
      <li>キーの音名を並べて、この型を当てはめれば、どのキーのコードも出せる</li>
    </Points>
  );
}

const C_MAJOR: Key = { mode: "major", tonic: note("C") };
const A_MINOR: Key = { mode: "minor", tonic: note("A") };

/** 型の呼び方（メジャー・マイナー・♭5） */
const kindOf = (c: DiatonicChord) =>
  c.toneLabels.includes("♭5") ? "♭5" : c.toneLabels.includes("♭3") ? "マイナー" : "メジャー";

/** 7 つのコードを、下からルート・3 度・5 度と積んだ図。間の数字は半音の数 */
function Stacks({ chords }: { chords: readonly DiatonicChord[] }) {
  return (
    <div class="stacks" role="img" aria-label={chords.map(c => `${c.label}：${c.tones.map(fmt).join(" ")}`).join("、")}>
      {chords.map(c => {
        const k = kindOf(c);
        return (
          <div key={c.degree} class={`stack stack--${k === "メジャー" ? "maj" : k === "マイナー" ? "min" : "dim"}`}>
            {[...c.tones].reverse().map((n, i, top) => (
              <Fragment key={i}>
                {i > 0 && <span class="stack-gap">{mod(pc(top[i - 1]!) - pc(n), 12)}</span>}
                <span class={`stack-note${i === top.length - 1 ? " root" : ""}`}>{fmt(n)}</span>
              </Fragment>
            ))}
            <span class="stack-name">{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** C D E … を 1 つ飛ばしで 3 つ取る（start の音から） */
const SCALE = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E"];
const skip = (start: number): StepItem[] =>
  SCALE.map((label, i) => ({ label, kind: i === start || i === start + 2 || i === start + 4 ? "hl" : "dim" }));

const chips = (
  chords: readonly DiatonicChord[],
  hl: (c: DiatonicChord) => boolean,
  sub: (c: DiatonicChord) => string,
) => chords.map((c): StepItem => ({ label: c.label, sub: sub(c), kind: hl(c) ? "hl" : undefined }));

/** A のキーのコードを、6 弦と 5 弦のルートで置いた図（ハイコードの E 型・A 型）。定番の進行の参考でも使う */
export function KeyMap({ caption }: { caption: string }) {
  const at = (string: number, fret: number, label: string) => ({
    pos: { string, fret },
    kind: label === "Ⅰ" ? ("root" as const) : label.startsWith("Ⅶ") ? ("hint" as const) : ("tone" as const),
    label,
  });
  return (
    <Fig caption={caption}>
      <Board
        range={{ minFret: 2, maxFret: 7 }}
        orientation="horizontal"
        label="キーのコードのルートの位置"
        marks={[
          at(6, 5, "Ⅰ"),
          at(6, 7, "Ⅱm"),
          at(5, 4, "Ⅲm"),
          at(5, 5, "Ⅳ"),
          at(5, 7, "Ⅴ"),
          at(6, 2, "Ⅵm"),
          at(6, 4, "Ⅶ"),
        ]}
      />
    </Fig>
  );
}

export function Body({ standard }: { standard: boolean }) {
  const c3 = diatonicChords(C_MAJOR, 3);
  const c4 = diatonicChords(C_MAJOR, 4);
  const a3 = diatonicChords(A_MINOR, 3);
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャーなら C D E F G A B の 7 音。それぞれの音から、スケールの音を 1 つ飛ばしで重ねる：C E G（C）、D F
          A（Dm）、E G B（Em）… 。スケールの音だけを使うので、3
          度が長いか短いかは場所によって決まり、型の並びがどのキーでも同じになる。
        </p>
        <Fig caption="D から 1 つ飛ばしで D F A＝Dm。♯・♭ を付けず、スケールの音だけを使う">
          <Steps items={skip(1)} label="C メジャースケールの D から 1 つ飛ばし：D F A" />
        </Fig>
        <Fig caption="下からルート・3 度・5 度。数字は半音の数で、下が 4 ならメジャー（オレンジ）、3 ならマイナー。3 ＋ 3 は ♭5（赤）">
          <Stacks chords={c3} />
        </Fig>
        <p>
          ローマ数字は「キーの何番目の音がルートか」。数字で覚えておけば、キーが変わっても同じ進行を弾ける（C の
          Ⅱm7–Ⅴ7–ⅠM7 は Dm7–G7–CM7、G なら Am7–D7–GM7）。
        </p>
        <Figs>
          <Fig title="C のキー">
            <Steps
              items={[
                { label: "Ⅱm7", sub: "Dm7" },
                { label: "Ⅴ7", sub: "G7" },
                { label: "ⅠM7", sub: "CM7", kind: "hl" },
              ]}
            />
          </Fig>
          <Fig title="G のキー">
            <Steps
              items={[
                { label: "Ⅱm7", sub: "Am7" },
                { label: "Ⅴ7", sub: "D7" },
                { label: "ⅠM7", sub: "GM7", kind: "hl" },
              ]}
            />
          </Fig>
        </Figs>
        <h3>役割（機能）</h3>
        <Figs>
          <Fig title="トニック（T）" caption="落ち着く、帰ってくる場所">
            <Steps items={[{ label: "Ⅰ", kind: "hl" }, { label: "Ⅵm" }, { label: "Ⅲm" }]} />
          </Fig>
          <Fig title="サブドミナント（SD）" caption="少し離れて、動き出す感じ">
            <Steps items={[{ label: "Ⅳ", kind: "hl" }, { label: "Ⅱm" }]} />
          </Fig>
          <Fig title="ドミナント（D）" caption="緊張して、Ⅰ へ戻りたがる">
            <Steps items={[{ label: "Ⅴ（Ⅴ7）", kind: "hl" }, { label: "Ⅶm(♭5)" }]} />
          </Fig>
        </Figs>
        <p class="muted small">オレンジがそれぞれの役割の代表。同じ役割のコードは、互いに置き換えて使える。</p>
        <h3>マイナーキー</h3>
        <p>
          ナチュラルマイナーの並びは Ⅰm Ⅱm(♭5) ♭Ⅲ Ⅳm Ⅴm ♭Ⅵ ♭Ⅶ。これは平行調のメジャー（A マイナーなら C メジャー）と同じ
          7 つのコードを、Ⅵm から数え直したもの。実際の曲では、Ⅴm を Ⅴ7 に替えて（ハーモニックマイナーから借りて）Ⅰm
          へ強く戻ることが多い（分野の設定「マイナーの Ⅴ・Ⅶ をハーモニックマイナーから借りる」で出題にも入る）。
        </p>
        <Fig title="C メジャー" caption="上と下は同じ 7 つのコード。数え始め（Ⅰ）を Am にずらすと A マイナーの並び">
          <Steps items={c3.map(c => ({ label: c.symbol, sub: c.label, kind: c.symbol === "Am" ? "hl" : undefined }))} />
          <p class="lesson-fig-title">A マイナー</p>
          <Steps items={a3.map(c => ({ label: c.symbol, sub: c.label, kind: c.symbol === "Am" ? "hl" : undefined }))} />
        </Fig>
      </Section>
      <Tips>
        <Tip title="型の並びを唱える">
          「メジャー・マイナー・マイナー・メジャー・メジャー・マイナー・♭5」。メジャーは Ⅰ・Ⅳ・Ⅴ、マイナーは Ⅱ・Ⅲ・Ⅵ、Ⅶ
          だけ ♭5。
          <Steps items={chips(c3, c => kindOf(c) === "メジャー", kindOf)} label="Ⅰ から Ⅶ までの型" />
        </Tip>
        <Tip title="4 和音では Ⅴ だけが 7">
          4 和音にすると、M7 は Ⅰ と Ⅳ、7（ドミナント）は Ⅴ だけ。キーの中に 7 のコードは 1 つしかないので、7
          が出てきたら Ⅴ の目印になる。
          <Steps
            items={chips(
              c4,
              c => c.type.symbol === "7",
              c => c.symbol,
            )}
            label="C メジャーの 4 和音"
          />
        </Tip>
        {standard && (
          <Tip title="指板の上の位置で覚える">
            Ⅰ を 6 弦ルートに置くと、Ⅳ は 5 弦の同じフレット、Ⅴ は 5 弦の 2 フレット先、Ⅱm は 6 弦の 2 フレット先、Ⅵm は
            5 弦の 4 フレット先（6 弦の 3 フレット手前）。ハイコードの E 型・A
            型で、手をほとんど動かさずにキーのコードが全部弾ける。
            <KeyMap caption="A のキー（Ⅰ＝6 弦 5 フレット）。点はコードのルートで、6 弦は E 型、5 弦は A 型で押さえる" />
          </Tip>
        )}
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>
          Ⅶ をメジャーやマイナーにする。Ⅶ は m(♭5)（3 和音なら dim）
          <Figs>
            <Fig verdict="ok" caption="C のキーの Ⅶ は Bdim（B D F）。どれもキーの音">
              <Steps items={[{ label: "B" }, { label: "D" }, { label: "F" }]} />
            </Fig>
            <Fig verdict="ng" caption="B メジャーにすると D♯ と F♯ が要る。C のキーに無い音">
              <Steps items={[{ label: "B" }, { label: "D♯", kind: "ng" }, { label: "F♯", kind: "ng" }]} />
            </Fig>
          </Figs>
        </li>
        <li>
          キーの音名を間違える（F メジャーの 4 番目は B ではなく B♭）。先に五度圏で調号を確かめてからコードを作る
          <Fig caption="F メジャースケール。4 番目は A の半音上の B♭（輪）。B にすると A から全音になり、キーの外の音になる">
            <Keys
              keys={17}
              label="F メジャースケール：F G A B♭ C D E"
              marks={[
                { semi: 5, label: "F", kind: "root" },
                { semi: 7, label: "G" },
                { semi: 9, label: "A" },
                { semi: 10, label: "B♭", kind: "em" },
                { semi: 12, label: "C" },
                { semi: 14, label: "D" },
                { semi: 16, label: "E" },
              ]}
              arcs={[{ from: 9, to: 10, label: "半音", hl: true }]}
            />
          </Fig>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>上のキーをめくりながら、Ⅰ から Ⅶ までのコード名を声に出す。C・G・F など調号の少ないキーから</li>
          <li>好きな曲のコードを見て、そのキーの何番（ローマ数字）かを書き込む</li>
        </ul>
      </Section>
    </>
  );
}
