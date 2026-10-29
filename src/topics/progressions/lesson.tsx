/* 参考の本文：定番の進行 */
import { PROGRESSIONS } from ".";
import { type Key, ROMAN, chordSymbol, chordType, degree, mod, note, pc, transpose } from "../../theory";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Fig, Figs, Keys, type StepItem, Steps } from "../../ui/LessonFigures";
import { KeyMap } from "../diatonic/lesson";

export function Intro() {
  return (
    <Points>
      <li>進行はローマ数字（キーの何番目のコードか）で覚える。キーが変わっても同じ形で弾ける</li>
      <li>多くの進行は「トニック → サブドミナント → ドミナント → トニック」の流れか、その一部</li>
      <li>ルートが 5 度下（4 度上）へ進む動きが、いちばん強い「解決」になる（Ⅴ → Ⅰ、Ⅱ → Ⅴ）</li>
    </Points>
  );
}

/** 進行を札に。上がローマ数字、下が C（マイナーは A）のキーのコード。ルートが 5 度下へ進む所を強調 */
function Prog({ id }: { id: string }) {
  const pr = PROGRESSIONS.find(x => x.id === id)!;
  const key: Key = { mode: pr.mode, tonic: note(pr.mode === "major" ? "C" : "A") };
  const roots = pr.chords.map(c => transpose(key.tonic, degree(c.deg)));
  const items: StepItem[] = pr.chords.map((c, i) => {
    const iv = degree(c.deg);
    const roman = (iv.alt < 0 ? "♭" : iv.alt > 0 ? "♯" : "") + ROMAN[iv.num - 1] + chordType(c.type).symbol;
    return {
      label: roman,
      sub: chordSymbol(roots[i]!, chordType(c.type)),
      kind: i === pr.chords.length - 1 ? "hl" : undefined,
    };
  });
  const gaps = roots.slice(1).map((r, i) => {
    const fifthDown = mod(pc(r) - pc(roots[i]!), 12) === 5;
    return { label: fifthDown ? "5度下" : "→", hl: fifthDown };
  });
  return <Steps items={items} gaps={gaps} label={`${pr.name}：${items.map(x => x.sub).join(" ")}`} />;
}

/** ベースの音の並び（下がっていく） */
const Bass = ({ notes, label }: { notes: string[]; label: string }) => (
  <Steps
    label={label}
    items={notes.map(n => ({ label: n }))}
    gaps={notes
      .slice(1)
      .map((n, i) => ({ label: n === "F" && notes[i] === "E" ? "↑" : "↓", hl: !(n === "F" && notes[i] === "E") }))}
  />
);

/** 12 小節ブルースの並び（4 小節 × 3 段） */
function Blues() {
  const bars = "Ⅰ7 Ⅰ7 Ⅰ7 Ⅰ7 Ⅳ7 Ⅳ7 Ⅰ7 Ⅰ7 Ⅴ7 Ⅳ7 Ⅰ7 Ⅴ7".split(" ");
  const inC: Record<string, string> = { Ⅰ7: "C7", Ⅳ7: "F7", Ⅴ7: "G7" };
  return (
    <div class="blues-bars" role="img" aria-label={`12 小節ブルース：${bars.join(" ")}`}>
      {bars.map((b, i) => (
        <span key={i} class={`blues-bar blues-bar--${b === "Ⅰ7" ? "t" : b === "Ⅳ7" ? "sd" : "d"}`}>
          {b}
          <small>{inC[b]}</small>
        </span>
      ))}
    </div>
  );
}

export function Body({ standard }: { standard: boolean }) {
  return (
    <>
      <Section title="仕組み">
        <p>
          ダイアトニックコードには役割がある。Ⅰ（とⅥm・Ⅲm）は落ち着くトニック、Ⅳ（とⅡm）は動き出すサブドミナント、Ⅴ（Ⅴ7）は
          Ⅰ へ戻りたがるドミナント。進行は、この緊張と解決の組み合わせ。
        </p>
        <Fig caption="落ち着いた所から離れ、緊張して、また戻る。多くの進行はこの流れか、その一部">
          <Steps
            label="トニック、サブドミナント、ドミナント、トニック"
            items={[
              { label: "Ⅰ", sub: "T 落ち着く", kind: "hl" },
              { label: "Ⅳ", sub: "SD 動き出す" },
              { label: "Ⅴ", sub: "D 緊張" },
              { label: "Ⅰ", sub: "T 戻る", kind: "hl" },
            ]}
            gaps={[{ label: "→" }, { label: "→" }, { label: "解決", hl: true }]}
          />
        </Fig>
        <p class="muted small">
          下の札は、上がローマ数字、下が C のキー（マイナーは A マイナー）のコード。オレンジの「5度下」が、ルートが 5
          度下へ進む強い動き。
        </p>
        <h3>それぞれの進行の聴きどころ</h3>
        <ul>
          <li>
            <strong>Ⅱ–Ⅴ–Ⅰ</strong>：SD → D → T の最短の形。ルートが 4 度ずつ上がる（5
            度ずつ下がる）。ジャズでいちばん多い
            <Prog id="251" />
          </li>
          <li>
            <strong>Ⅰ–Ⅵ–Ⅱ–Ⅴ（循環）</strong>：Ⅵ からあとはルートが 5 度ずつ下がり、最後の Ⅴ がまた Ⅰ
            へ戻る。くり返して使う
            <Prog id="1625" />
          </li>
          <li>
            <strong>王道進行（Ⅳ–Ⅴ–Ⅲm–Ⅵm）</strong>：サブドミナントから始まり、Ⅰ に戻らずに Ⅵm
            で止まる。切なく、次へ続く感じ
            <Prog id="ohdo" />
          </li>
          <li>
            <strong>小室進行（Ⅵm–Ⅳ–Ⅴ–Ⅰ）</strong>：マイナーから始まり、最後に Ⅰ へ解決する
            <Prog id="komuro" />
          </li>
          <li>
            <strong>カノン進行</strong>：ベースが 1 音ずつ下がっていく（Ⅰ–Ⅴ–Ⅵm–Ⅲm–Ⅳ–Ⅰ–Ⅳ–Ⅴ）。Ⅴ・Ⅲm
            を転回形にすると、ベースが C B A G F E F G と順に下がる
            <Prog id="canon" />
            <Bass notes={["C", "B", "A", "G", "F", "E", "F", "G"]} label="カノン進行のベース：C B A G F E F G" />
          </li>
          <li>
            <strong>12 小節ブルース</strong>：Ⅰ7・Ⅳ7・Ⅴ7 の 3 つだけ。どれも 7th（ドミナント）の響きのまま進む
            <Fig caption="1 段が 4 小節。オレンジが Ⅰ7、太い枠が Ⅴ7。Ⅴ7 は 9 小節目と、頭へ戻る直前の 12 小節目">
              <Blues />
            </Fig>
          </li>
          <li>
            <strong>マイナーの Ⅱ–Ⅴ–Ⅰ</strong>：Ⅱm7(♭5)–Ⅴ7–Ⅰm7。Ⅴ はマイナーキーでもメジャーの
            7th（ハーモニックマイナーから借りる）
            <Prog id="minor251" />
          </li>
          <li>
            <strong>アンダルシア進行（Ⅰm–♭Ⅶ–♭Ⅵ–Ⅴ）</strong>：ベースが A G F E と下がり、最後の Ⅴ（メジャー）が強く Ⅰm
            へ戻る
            <Prog id="minor-andalusian" />
            <Bass notes={["A", "G", "F", "E"]} label="アンダルシア進行のベース：A G F E" />
          </li>
        </ul>
      </Section>
      <Tips>
        <Tip title="ルートの動きで覚える">
          「5 度下へ進む」「1
          音ずつ下がる」のように、ルート（ベース）の動きで覚えると、コード名を覚えなくてもキーを変えて弾ける。
        </Tip>
        {standard && (
          <Tip title="6 弦と 5 弦のルートの位置で弾く">
            Ⅰ を 6 弦のフレット f に置くと、Ⅳ は 5 弦の f、Ⅴ は 5 弦の f＋2、Ⅱm は 6 弦の f＋2、Ⅵm は 6 弦の f−3（5 弦の
            f＋4）、Ⅲm は 5 弦の f−1。ハイコードの E 型と A 型で、手の位置をほとんど変えずに全部の進行が弾ける。
            <KeyMap caption="A のキー（f＝5）。王道進行なら Ⅳ → Ⅴ → Ⅲm → Ⅵm を、この点の上で順に押さえる" />
          </Tip>
        )}
        <Tip title="耳で区別するポイント">
          最後に Ⅰ
          へ戻って終わるか（Ⅱ–Ⅴ–Ⅰ・小室）、戻らずに続くか（王道）。ベースが下がり続けるか（カノン・アンダルシア）。
        </Tip>
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>
          ローマ数字を「その音名」と取り違える。Ⅴ は「キーの 5 番目の音がルート」で、G とは限らない（F のキーなら C）
          <Figs wide>
            <Fig title="C のキー">
              <Steps
                items={["C", "D", "E", "F", "G"].map((l, i) => ({
                  label: l,
                  sub: ROMAN[i],
                  kind: i === 4 ? "hl" : "dim",
                }))}
              />
            </Fig>
            <Fig title="F のキー">
              <Steps
                items={["F", "G", "A", "B♭", "C"].map((l, i) => ({
                  label: l,
                  sub: ROMAN[i],
                  kind: i === 4 ? "hl" : "dim",
                }))}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          マイナーキーの Ⅴ を m のままにする。解決させたいときは Ⅴ7
          <Figs wide>
            <Fig verdict="ok" title="E7 → Am" caption="E7 の G♯ が半音上の A（Am のルート）へ。強く戻る">
              <Keys
                keys={15}
                label="E7 の G♯ から A へ半音"
                marks={[
                  { semi: 4, label: "E" },
                  { semi: 8, label: "G♯", kind: "em" },
                  { semi: 9, label: "A", kind: "root" },
                  { semi: 11, label: "B" },
                  { semi: 14, label: "D" },
                ]}
                arcs={[{ from: 8, to: 9, label: "半音", hl: true }]}
              />
            </Fig>
            <Fig verdict="ng" title="Em → Am" caption="Em の G から A は全音。戻る力が弱い">
              <Keys
                keys={15}
                label="Em の G から A へ全音"
                marks={[
                  { semi: 4, label: "E" },
                  { semi: 7, label: "G", kind: "em" },
                  { semi: 9, label: "A", kind: "root" },
                  { semi: 11, label: "B" },
                ]}
                arcs={[{ from: 7, to: 9, label: "全音" }]}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C のキーで弾けたら、G・D・A・F へ移して同じ進行を弾く（ローマ数字のまま考える）</li>
          <li>知っている曲のコードを書き出して、どの進行が使われているか探す</li>
        </ul>
      </Section>
    </>
  );
}
