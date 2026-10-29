/* 参考の本文：セカンダリードミナントと裏コード */
import type { Mark } from "../../drill/topic";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, Keys, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>
        セカンダリードミナントは、キーの中のコードを一時的に Ⅰ とみなして、その <strong>5 度上の 7th</strong>{" "}
        を前に置いたもの
      </li>
      <li>
        裏コードは、ドミナントの代わりに使う <strong>解決先の半音上の 7th</strong>（ドミナントの減 5 度上）
      </li>
      <li>どちらも、解決先へ向かう力を強める「寄り道」のコード</li>
    </Points>
  );
}

/** ドミナント → 解決先の札（間に「5 度下」） */
const Resolve = ({ from, fromSub, to, toSub }: { from: string; fromSub: string; to: string; toSub: string }) => (
  <Steps
    items={[
      { label: from, sub: fromSub, kind: "hl" },
      { label: to, sub: toSub },
    ]}
    gaps={[{ label: "5度下→", hl: true }]}
  />
);

/** 解決先とドミナント・裏コードの位置（レギュラーチューニング） */
function Places({
  target,
  dom,
  sub,
  caption,
}: {
  target: [number, number, string];
  dom: [number, number, string];
  sub: [number, number, string];
  caption: string;
}) {
  const m = ([string, fret, label]: [number, number, string], kind: Mark["kind"]): Mark => ({
    pos: { string, fret },
    kind,
    label,
  });
  const frets = [target[1], dom[1], sub[1]];
  return (
    <Fig caption={caption}>
      <Board
        range={{ minFret: Math.min(...frets) - 1, maxFret: Math.min(...frets) + 5 }}
        orientation="horizontal"
        label={caption}
        marks={[m(target, "root"), m(dom, "tone"), m(sub, "target")]}
      />
    </Fig>
  );
}

export function Body({ standard }: { standard: boolean }) {
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャーで G7 → C と解決するのと同じことを、ほかのコードに向けて行う。Dm へ向かうなら D の 5 度上の A7、Am
          へなら E7。書き方は「Ⅴ7/Ⅱ（Ⅱ へのドミナント）」のようにする。A7 の 3 度の C♯ はキーの外の音で、これが D
          へ半音で上がる力を作る。
        </p>
        <Figs>
          <Fig title="いつもの解決">
            <Resolve from="G7" fromSub="Ⅴ7" to="C" toSub="Ⅰ" />
          </Fig>
          <Fig title="Dm を Ⅰ とみなす">
            <Resolve from="A7" fromSub="Ⅴ7/Ⅱ" to="Dm" toSub="Ⅱm" />
          </Fig>
        </Figs>
        <Fig caption="A7 の 3 度 C♯ はキーの外の黒鍵。半音上の D（Dm のルート）へ引っぱられる">
          <Keys
            keys={15}
            label="A7 の構成音と、C♯ から D への半音"
            marks={[
              { semi: 9, label: "R", kind: "root" },
              { semi: 13, label: "3", kind: "em" },
              { semi: 4, label: "5" },
              { semi: 7, label: "♭7" },
            ]}
            arcs={[{ from: 13, to: 14, label: "半音→D", below: true, hl: true }]}
          />
        </Fig>
        <p>
          裏コード（トライトーン代理）：G7 の 3 度（B）と ♭7（F）は、D♭7 の ♭7（C♭＝B）と 3 度（F）と同じ 2
          音。だから入れ替えても同じ方向へ解決する。D♭7 → C はベースが半音で下がって、なめらかにつながる。
        </p>
        <Figs>
          <Fig title="G7" caption="輪の 2 音（B と F）が緊張を作る">
            <Keys
              label="G7：G B D F"
              marks={[
                { semi: 7, label: "R", kind: "root" },
                { semi: 11, label: "3", kind: "em" },
                { semi: 2, label: "5" },
                { semi: 5, label: "♭7", kind: "em" },
              ]}
            />
          </Fig>
          <Fig title="D♭7" caption="輪の 2 音は同じ鍵。3 度と ♭7 が入れ替わっただけ">
            <Keys
              label="D♭7：D♭ F A♭ C♭"
              marks={[
                { semi: 1, label: "R", kind: "root" },
                { semi: 5, label: "3", kind: "em" },
                { semi: 8, label: "5" },
                { semi: 11, label: "♭7", kind: "em" },
              ]}
            />
          </Fig>
        </Figs>
        <Figs wide>
          <Fig title="表（G7）" caption="ベースは 5 度下へ跳ぶ">
            <Steps
              items={[{ label: "Dm7" }, { label: "G7", kind: "hl" }, { label: "C" }]}
              gaps={[{ label: "→" }, { label: "→" }]}
            />
            <Steps items={[{ label: "D" }, { label: "G" }, { label: "C" }]} label="ベース：D G C" />
          </Fig>
          <Fig title="裏（D♭7）" caption="ベースが半音ずつ下がる">
            <Steps
              items={[{ label: "Dm7" }, { label: "D♭7", kind: "hl" }, { label: "C" }]}
              gaps={[{ label: "→" }, { label: "→" }]}
            />
            <Steps
              items={[{ label: "D" }, { label: "D♭" }, { label: "C" }]}
              gaps={[
                { label: "半音↓", hl: true },
                { label: "半音↓", hl: true },
              ]}
              label="ベース：D D♭ C"
            />
          </Fig>
        </Figs>
      </Section>
      <Tips>
        <Tip title="3 度は解決先のルートの半音下">
          セカンダリードミナントの 3 度は、いつも解決先のルートの半音下（導音）。A7 の C♯ → D、E7 の G♯ → A、D7 の F♯ →
          G。キーの外の ♯ が 1 つ出てくるのが目印。
          {(
            [
              ["A7", "C♯", "Dm", "D"],
              ["E7", "G♯", "Am", "A"],
              ["D7", "F♯", "G", "G"],
            ] as const
          ).map(([dom, third, to, root]) => (
            <Steps
              key={dom}
              items={[
                { label: third, sub: `${dom} の 3`, kind: "hl" },
                { label: root, sub: `${to} の R` },
              ]}
              gaps={[{ label: "半音↑" }]}
            />
          ))}
        </Tip>
        <Tip title="ダイアトニックのコードを 7th に変える">
          C のキーなら、Am → A7、Em → E7、Dm → D7、Bm7(♭5) → B7、C → C7。キーの中のコードの型を「7」に変えると、それぞれ
          5 度下のコードへのドミナントになる。
          <Steps
            label="型を 7 に変えたコードと、その解決先"
            items={[
              { label: "C7", sub: "→ F" },
              { label: "D7", sub: "→ G" },
              { label: "E7", sub: "→ Am" },
              { label: "A7", sub: "→ Dm" },
              { label: "B7", sub: "→ Em" },
            ]}
          />
          <p class="muted small">下の小さい字が解決先（5 度下）。ルートの音名は変わらず、型だけが 7 になる。</p>
        </Tip>
        <Tip title="裏コードは解決先の半音上">
          ドミナントのルートから減 5 度（半音 6 つ）＝解決先のルートの半音上。C へなら D♭7、Am へなら B♭7、G へなら
          A♭7。
          <Fig caption="C へ向かう表（G）と裏（D♭）。裏は C のすぐ隣の鍵で、表とは半音 6 つ離れている">
            <Keys
              keys={13}
              label="解決先 C、表の G、裏の D♭"
              marks={[
                { semi: 0, label: "C", kind: "root" },
                { semi: 1, label: "裏", kind: "em" },
                { semi: 7, label: "表" },
              ]}
              arcs={[
                { from: 1, to: 0, label: "半音", below: true, hl: true },
                { from: 1, to: 7, label: "6" },
              ]}
            />
          </Fig>
        </Tip>
        {standard && (
          <Tip title="指板の上の位置">
            解決先が 5 弦ルートなら、ドミナントは 6 弦の同じフレット。解決先が 6 弦ルートなら、ドミナントは 5 弦の 2
            フレット先。裏コードは解決先のルートの 1 フレット先。
            <Places
              target={[5, 3, "C"]}
              dom={[6, 3, "G7"]}
              sub={[5, 4, "D♭7"]}
              caption="解決先 C（5 弦 3）。表の G7 は 6 弦の同じフレット、裏の D♭7 は 1 フレット先"
            />
            <Places
              target={[6, 3, "G"]}
              dom={[5, 5, "D7"]}
              sub={[6, 4, "A♭7"]}
              caption="解決先 G（6 弦 3）。表の D7 は 5 弦の 2 フレット先、裏の A♭7 は 1 フレット先"
            />
          </Tip>
        )}
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>
          5 度上と 5 度下を逆にする。ドミナントは解決先の 5 度上（Dm へは A7。G7 ではない）
          <Figs wide>
            <Fig verdict="ok" caption="A は D の 5 度上。A7 から D へ 5 度下がる">
              <Steps items={[{ label: "A7", kind: "hl" }, { label: "Dm" }]} gaps={[{ label: "5度下→", hl: true }]} />
            </Fig>
            <Fig verdict="ng" caption="G は D の 5 度下。G7 から D へは 5 度上がってしまう">
              <Steps items={[{ label: "G7", kind: "ng" }, { label: "Dm" }]} gaps={[{ label: "5度上→" }]} />
            </Fig>
          </Figs>
        </li>
        <li>
          裏コードを「ドミナントの半音上」にする。正しくは解決先の半音上（G7 の裏は D♭7）
          <Figs wide>
            <Fig verdict="ok" caption="C の半音上の D♭">
              <Steps
                items={[{ label: "D♭7", sub: "C の半音上", kind: "hl" }, { label: "C" }]}
                gaps={[{ label: "半音↓", hl: true }]}
              />
            </Fig>
            <Fig verdict="ng" caption="G7 の半音上の A♭7 は、C へは解決しない">
              <Steps
                items={[{ label: "A♭7", sub: "G の半音上", kind: "ng" }, { label: "C" }]}
                gaps={[{ label: "→" }]}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C → A7 → Dm → G7 → C のように、ダイアトニックの進行の前にセカンダリードミナントを差し込んで弾く</li>
          <li>Dm7 → G7 → C を Dm7 → D♭7 → C に替えて、ベースが半音で下がる響きを聴く</li>
        </ul>
      </Section>
    </>
  );
}
