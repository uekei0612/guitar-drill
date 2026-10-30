/* 参考の本文：ローコードの押さえ方 */
import { openChordById } from ".";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { Fig, Figs, PressSpot } from "../../ui/LessonFigures";
import { ChordFig } from "../chord-shapes/figures";
import type { LabelMode } from "../chord-shapes/shape";

export function Intro() {
  return (
    <Points>
      <li>ローコードは、開放弦を使ってナット近く（1〜3 フレット）で押さえるコード</li>
      <li>
        まず基本の 8 つ：<strong>C A G E D</strong> と <strong>Am Em Dm</strong>
      </li>
      <li>形は「似たもの同士の違い」で覚えると速い（メジャーとマイナーは 1 フレットの違い）</li>
    </Points>
  );
}

const p = (string: number, fret: number) => ({ string, fret });

/** 一覧の押さえ方を図に（em：輪で目立たせる音、keep：緑の指） */
function Chord({
  id,
  mode = "finger",
  ...rest
}: {
  id: string;
  mode?: LabelMode;
  caption?: string;
  em?: { string: number; fret: number }[];
  keep?: { string: number; fret: number }[];
  mutedWrong?: number[];
  verdict?: "ok" | "ng";
}) {
  const c = openChordById(id);
  return <ChordFig shape={c.shape} root={c.root} type={c.type} mode={mode} {...rest} />;
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          コードは、ルート（R）・3 度・5 度の 3 つの音（トライアド）でできている。ローコードは、この 3 つの音を開放弦と
          1〜3 フレットで集めた形。同じ音が何本かの弦で重なっているので、6 本の弦を鳴らしても音の種類は 3 つ（7th なら 4
          つ）。
        </p>
        <Figs>
          <Chord id="C" mode="degree" caption="5 弦から R・3・5・R・3。鳴る音は C・E・G の 3 種類" />
          <Chord id="G" mode="degree" caption="6 本とも鳴らしても、G・B・D の 3 種類" />
        </Figs>
        <p>
          ×
          の弦は鳴らさない。鳴らすとルートより低い音や、コードに無い音が混ざる。鳴らし始める弦は、たいていルートのある弦（C
          と A は 5 弦、G と E は 6 弦、D は 4 弦）。
        </p>
        <Figs>
          <Chord id="C" caption="6 弦は ×。ルートのある 5 弦から鳴らす" />
          <Chord id="D" caption="5・6 弦は ×。開放の 4 弦（D）から鳴らす" />
        </Figs>
      </Section>
      <Tips>
        <Tip title="メジャーとマイナーは 3 度の 1 音だけ">
          3 度の音を 1 フレット下げるとマイナーになる。E → Em は 3 弦 1 フレットを離す、A → Am は 2 弦 2 フレットを 1
          フレットへ、D → Dm は 1 弦 2 フレットを 1 フレットへ。
          <Figs>
            <Chord id="E" mode="degree" em={[p(3, 1)]} />
            <Chord id="Em" mode="degree" em={[p(3, 0)]} caption="3 弦を離して開放に" />
            <Chord id="A" mode="degree" em={[p(2, 2)]} />
            <Chord id="Am" mode="degree" em={[p(2, 1)]} caption="2 弦を 2 → 1 フレット" />
            <Chord id="D" mode="degree" em={[p(1, 2)]} />
            <Chord id="Dm" mode="degree" em={[p(1, 1)]} caption="1 弦を 2 → 1 フレット" />
          </Figs>
          輪で囲んだ音が 3 度。変わるのはこの 1 音だけで、ほかの指はそのまま。
        </Tip>
        <Tip title="E と Am は同じ形">
          E の指の形（人・中・薬）を、そのまま 1 本ずつ細い弦へずらすと Am。片方を覚えればもう片方も押さえられる。
          <Figs>
            <Chord id="E" caption="6〜4 弦側で 人・中・薬" />
            <Chord id="Am" caption="同じ形を 1 本細い弦へ" />
          </Figs>
        </Tip>
        <Tip title="7th はルートを 1 つ ♭7 に替える">
          メジャーの形から、重なっているルートの 1 つを全音（2 フレット）下げて ♭7 にする。E7 は 4 弦を開放に、A7 は 3
          弦を開放に、G7 は 1 弦を 1 フレットに、D7 は 2 弦を 1 フレットに。C7 だけは、開放の 3 弦（5 度の G）を小指で 3
          フレット（B♭）にする。
          <Figs>
            <Chord id="E" mode="degree" em={[p(4, 2)]} />
            <Chord id="E7" mode="degree" em={[p(4, 0)]} caption="4 弦の R を離して ♭7 に" />
            <Chord id="A" mode="degree" em={[p(3, 2)]} />
            <Chord id="A7" mode="degree" em={[p(3, 0)]} caption="3 弦の R を離して ♭7 に" />
          </Figs>
        </Tip>
        <Tip title="C A G E D はハイコードの元">
          この 5 つの形は、人差し指でバレーして平行移動するとハイコードになる（特に E と A
          の形）。いまの形をきちんと覚えておくと、ハイコードがすぐ覚えられる。
          <Figs>
            <Chord id="E" caption="開放の E" />
            <Chord id="F" caption="E の形を 1 フレット上へ。人差し指がナットの代わり" />
          </Figs>
        </Tip>
        <Tip title="コードチェンジは動かない指を探す">
          C ↔ Am は人差し指と中指がそのまま、薬指だけ動く。D ↔ Dm は薬指がそのまま。E ↔ Am は形を保ったまま 1
          本ずらす。残せる指は残して、動きを減らす。
          <Figs>
            <Chord id="C" keep={[p(4, 2), p(2, 1)]} />
            <Chord id="Am" keep={[p(4, 2), p(2, 1)]} caption="緑の指は動かさない。薬指だけ 5 弦 → 3 弦" />
          </Figs>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          × の弦を鳴らしてしまう（C の 6 弦、D の 5・6 弦が多い）。最初はルートの弦から弾き始める
          <Figs>
            <Chord id="D" verdict="ok" caption="4 弦から下だけ鳴らす" />
            <Chord id="D" verdict="ng" mutedWrong={[6, 5]} caption="赤い × の弦まで鳴らすと、D より低い音が混ざる" />
          </Figs>
        </li>
        <li>指の腹が隣の弦に触れて、開放弦が鳴らない。指を立てて指先で押さえ、1 本ずつ鳴らして確かめる</li>
        <li>
          フレットの真ん中を押さえて音がビリつく。フレット（金属の棒）のすぐ手前を押さえる
          <Figs>
            <Fig verdict="ok" caption="フレットのすぐ手前">
              <PressSpot at="near" label="フレットのすぐ手前を押さえる" />
            </Fig>
            <Fig verdict="ng" caption="フレットの間の真ん中">
              <PressSpot at="middle" label="フレットの間の真ん中を押さえる" />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>押さえたら、6 弦から 1 本ずつ鳴らして全部の音が出ているか確かめる</li>
          <li>2 つのコードを決めて、1 分間で何回行き来できるか数える（C ↔ G、Am ↔ E など）</li>
          <li>図を見ずに「C は 5 弦 3・4 弦 2・2 弦 1」のように、弦とフレットを口で言えるようにする</li>
        </ul>
      </Section>
    </>
  );
}
