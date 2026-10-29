/* 参考の本文：ハイコードの押さえ方 */
import { barreShape, formOf } from ".";
import { STANDARD, note } from "../../theory";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { Fig, Figs, PressSpot } from "../../ui/LessonFigures";
import { ChordFig } from "../chord-shapes/figures";
import type { LabelMode } from "../chord-shapes/shape";
import { openChordById } from "../open-chords";
import { Landmarks } from "../fret-notes/lesson";

export function Intro() {
  return (
    <Points>
      <li>ハイコードは、ローコードの E・A の形を人差し指のバレー（セーハ）でずらしたもの</li>
      <li>
        <strong>6 弦ルート＝E 型、5 弦ルート＝A 型</strong>。ルートの弦の音名がコードの名前になる
      </li>
      <li>形は 2 つ、ずらす場所は「ルートの弦の何フレットか」で決まる</li>
    </Points>
  );
}

const p = (string: number, fret: number) => ({ string, fret });

interface FigProps {
  mode?: LabelMode;
  title?: string;
  caption?: string;
  em?: { string: number; fret: number }[];
  keep?: { string: number; fret: number }[];
  mutedWrong?: number[];
  verdict?: "ok" | "ng";
}

/** フォーム（6 弦ルート＝E 型・5 弦ルート＝A 型）をルートの位置に置いた図 */
function Form({ str, type = "maj", root, ...rest }: FigProps & { str: 6 | 5; type?: string; root: string }) {
  const r = note(root);
  return <ChordFig shape={barreShape(STANDARD, formOf(str, type), r)} root={r} type={type} {...rest} />;
}

/** ローコード（元の形） */
function Open({ id, ...rest }: FigProps & { id: string }) {
  const c = openChordById(id);
  return <ChordFig shape={c.shape} root={c.root} type={c.type} {...rest} />;
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          開放の
          E（022100）の形を、中指・薬指・小指で押さえ直し、空いた人差し指でナットの代わりに全部の弦を押さえる。このまま
          1 フレット上へずらすと F、3 フレットなら G。形が同じなので音の並び（R・3・5）も同じで、ルートだけが変わる。
        </p>
        <Figs>
          <Open id="E" caption="元の形（開放）" />
          <Form str={6} root="F" caption="1 フレットへ。人差し指がナットの代わり" />
          <Form str={6} root="G" caption="3 フレットへずらすと G" />
        </Figs>
        <p>A 型も同じ。開放の A（x02220）を 1 フレット上へずらすと B♭、3 フレットなら C。</p>
        <Figs>
          <Open id="A" caption="元の形（開放）" />
          <Form str={5} root="Bb" caption="1 フレットへずらすと B♭" />
          <Form str={5} root="C" caption="3 フレットへずらすと C" />
        </Figs>
        <p>
          そのため名前を決めるのは「ルートの弦の何フレットか」だけ。6 弦と 5
          弦の音名（「指板の音名」の分野）が分かれば、どのコードも 2 か所で押さえられる。
        </p>
      </Section>
      <Tips>
        <Tip title="ルートの目印">
          6 弦：3=G・5=A・7=B・8=C・10=D・12=E。5 弦：3=C・5=D・7=E・8=F・10=G・12=A。上の表のフレットは、この目印から
          1〜2 フレット数えれば出る。
          <Landmarks />
        </Tip>
        <Tip title="同じコードを 2 か所で">
          C なら 5 弦 3 フレットの A 型と、6 弦 8 フレットの E 型。近い方を選ぶとコードチェンジが楽になる（G → C は、6
          弦 3 フレットの G から 5 弦 3 フレットの C へ、同じフレットで弦を 1 本移るだけ）。
          <Figs>
            <Form str={5} root="C" mode="degree" title="C（A 型）" caption="5 弦 3 フレットがルート" />
            <Form str={6} root="C" mode="degree" title="C（E 型）" caption="6 弦 8 フレットがルート" />
          </Figs>
        </Tip>
        <Tip title="型の変え方はローコードと同じ">
          E 型：3 弦の中指を離すと m、4 弦の小指を離すと 7、両方離すと m7。A 型：2 弦を 1 フレット下げると m、3
          弦を離すと 7、両方で m7。離した弦は人差し指のバレーが鳴らす。
          <Figs>
            <Form str={6} root="G" mode="degree" em={[p(3, 4)]} />
            <Form str={6} root="G" type="m" mode="degree" em={[p(3, 3)]} caption="3 弦を離すと、バレーの ♭3 が鳴る" />
            <Form str={5} root="C" mode="degree" em={[p(2, 5)]} />
            <Form str={5} root="C" type="m" mode="degree" em={[p(2, 4)]} caption="2 弦を 1 フレット下げて ♭3 に" />
          </Figs>
          輪で囲んだのが 3 度。7 の付く形も、ローコードと同じくルートの 1 つを ♭7 に替えたもの（下の一覧で確かめる）。
        </Tip>
        <Tip title="バレーは全部の弦を押さえなくていい">
          E 型で人差し指が鳴らすのは 6・2・1
          弦だけ（ほかは別の指が押さえる）。人差し指は少し横に転がして骨の側で押さえ、腕を後ろへ引く力で押さえると、握力を使わずに済む。
          <Figs>
            <Form str={6} root="G" keep={[p(6, 3), p(2, 3), p(1, 3)]} caption="緑の 3 本だけが、人差し指で鳴らす弦" />
          </Figs>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          A 型で 6 弦を鳴らしてしまう。6 弦は人差し指の先で軽く触れて消音する
          <Figs>
            <Form str={5} root="C" verdict="ok" caption="6 弦は × のまま" />
            <Form str={5} root="C" verdict="ng" mutedWrong={[6]} caption="6 弦が鳴ると、ルートより低い音が混ざる" />
          </Figs>
        </li>
        <li>
          フレットから離れた所をバレーして音がこもる。人差し指はフレットのすぐ手前に置く
          <Figs>
            <Fig verdict="ok" caption="フレットのすぐ手前">
              <PressSpot at="near" barre label="フレットのすぐ手前をバレーする" />
            </Fig>
            <Fig verdict="ng" caption="フレットの間の真ん中">
              <PressSpot at="middle" barre label="フレットの間の真ん中をバレーする" />
            </Fig>
          </Figs>
        </li>
        <li>
          E 型と A 型でルートの弦を取り違える。名前を決めるのは、いちばん低く鳴る弦の音
          <Figs>
            <Form str={6} root="G" mode="degree" caption="6 弦 3 フレットがルート → G" />
            <Form str={5} root="C" mode="degree" caption="同じ 3 フレットでも、5 弦がルート → C" />
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>押さえやすい 5 フレットあたり（A の E 型、D の A 型）で、1 本ずつ鳴らして全部の音を出す練習から</li>
          <li>同じ形のまま 1 フレットずつずらし、ルートの音名を声に出す（F・F♯・G…）</li>
          <li>「G → C → D」のような進行を、全部ハイコードで、近い位置を選んで弾く</li>
        </ul>
      </Section>
    </>
  );
}
