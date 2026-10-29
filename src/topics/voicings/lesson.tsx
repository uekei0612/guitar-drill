/* 参考の本文：ボイシングの型 */
import { useContext } from "preact/hooks";
import { VOICINGS, shapeOf } from ".";
import type { Mark } from "../../drill/topic";
import { stringCount } from "../../theory";
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, LessonBoard, type StepItem, Steps } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>ボイシングは、同じコードの音をどの順・どの高さで積むか。同じ G7 でも響きと押さえ方が変わる</li>
      <li>
        <strong>シェル</strong>は R・3・7 の 3 音（5 度を省く）。コードの型を決める 3 度と 7
        度だけを残した、いちばん小さい形
      </li>
      <li>
        <strong>ドロップ 2・ドロップ 3</strong>は、音を詰めて並べた形（密集配置）から 1 音を 1
        オクターブ下げて、ギターで押さえやすくした形
      </li>
    </Points>
  );
}

/** 音の積み方（下が低い音）。[度数, G7 の音名, 強調] */
type Tone = readonly [string, string, StepItem["kind"]?];
const Stack = ({ tones, label }: { tones: readonly Tone[]; label: string }) => (
  <div class="vstack" role="img" aria-label={label}>
    {tones.map(([d, n, kind], i) => (
      <span key={i} class={`step-item${kind ? ` ${kind}` : ""}`}>
        {d}
        <small>{n}</small>
      </span>
    ))}
  </div>
);

/** ボイシングの形を指板に。em の度数は輪で目立たせる。形が作れない（弦が足りない等）ときは出さない */
function VoiceFig({
  vid,
  type,
  fret,
  em = [],
  title,
  caption,
}: {
  vid: string;
  type: string;
  fret: number;
  em?: readonly string[];
  title?: string;
  caption?: string;
}) {
  const { tuning: t } = useContext(LessonBoard);
  const v = VOICINGS.find(x => x.id === vid)!;
  if (!v.strings.every(s => s <= stringCount(t))) return null;
  const s = shapeOf(t, v, type, fret);
  if (!s) return null;
  const frets = s.positions.map(p => p.fret);
  // 2 列に並べても字が読めるよう、見せるフレットは 4 つに詰める（コードの図と同じ）
  const minFret = Math.min(...frets);
  const marks: Mark[] = s.positions.map((pos, i) => ({
    pos,
    kind: i === 0 ? "root" : em.includes(s.labels[i]!) ? "target" : "tone",
    label: s.labels[i],
  }));
  return (
    <Fig title={title} caption={caption}>
      <Board
        range={{ minFret, maxFret: Math.max(minFret + 3, ...frets) }}
        label={`${v.name}：${s.labels.join(" ")}`}
        marks={marks}
      />
    </Fig>
  );
}

export function Body() {
  const { tuning } = useContext(LessonBoard);
  const standard = tuning.id === "standard";
  return (
    <>
      <Section title="仕組み">
        <p>
          4 和音を R 3 5 7 の順に詰めて積む（密集配置）と、音の間が狭すぎて、ギターでは指が届かない。そこで 1 音だけを 1
          オクターブ下げて、音の間を広げる。
        </p>
        <ul>
          <li>
            <strong>ドロップ 2</strong>：密集配置の上から 2 番目の音を下げる。隣り合う 4 本の弦（1〜4・2〜5・3〜6
            弦）で押さえられる
          </li>
          <li>
            <strong>ドロップ 3</strong>：上から 3 番目の音を下げる。1 本弦を飛ばした 4 本（6・4・3・2 弦、5・3・2・1
            弦）で押さえ、低音が広がる
          </li>
          <li>
            <strong>シェル</strong>：R・3・7（または R・7・3）。6 弦か 5 弦のルートに、3 度と 7 度を 2
            本の弦で足す。伴奏で、ベースや他の楽器とぶつかりにくい
          </li>
        </ul>
        <Figs>
          <Fig title="密集配置" caption="上から 2 番目（R）を…">
            <Stack
              label="G7 の密集配置：低い方から D F G B"
              tones={[
                ["5", "D"],
                ["♭7", "F"],
                ["R", "G", "hl"],
                ["3", "B"],
              ]}
            />
          </Fig>
          <Fig title="ドロップ 2" caption="…1 オクターブ下げて、いちばん下へ">
            <Stack
              label="G7 のドロップ 2：低い方から G D F B"
              tones={[
                ["R", "G", "hl"],
                ["5", "D"],
                ["♭7", "F"],
                ["3", "B"],
              ]}
            />
          </Fig>
          <Fig title="密集配置" caption="上から 3 番目（R）を…">
            <Stack
              label="G7 の密集配置：低い方から F G B D"
              tones={[
                ["♭7", "F"],
                ["R", "G", "hl"],
                ["3", "B"],
                ["5", "D"],
              ]}
            />
          </Fig>
          <Fig title="ドロップ 3" caption="…1 オクターブ下げると、R と ♭7 の間が大きく開く">
            <Stack
              label="G7 のドロップ 3：低い方から G F B D"
              tones={[
                ["R", "G", "hl"],
                ["♭7", "F"],
                ["3", "B"],
                ["5", "D"],
              ]}
            />
          </Fig>
        </Figs>
        <p class="muted small">どれも G7 の例で、下が低い音。小さい字が音名。</p>
        <Figs>
          <Fig title="シェル（R 3 7）">
            <Stack
              label="シェル：G B F"
              tones={[
                ["R", "G"],
                ["3", "B", "hl"],
                ["♭7", "F", "hl"],
              ]}
            />
          </Fig>
          <Fig title="シェル（R 7 3）">
            <Stack
              label="シェル：G F B"
              tones={[
                ["R", "G"],
                ["♭7", "F", "hl"],
                ["3", "B", "hl"],
              ]}
            />
          </Fig>
        </Figs>
        <p class="muted small">シェルは 5 度を省いた 3 音。色の 3 度と 7 度が、コードの型を決める。</p>
      </Section>
      <Tips>
        <Tip title="3 度と 7 度（ガイドトーン）を探す">
          どの型でも、まず 3 度と 7 度の位置を見つける。M7 ↔ 7 ↔ m7 の違いは、この 2
          音のどちらかが半音動くだけ。ルートと 5 度は省いてもコードの型は変わらない。
          <Figs>
            <VoiceFig vid="shell-6a" type="M7" fret={3} em={["7"]} title="M7" />
            <VoiceFig vid="shell-6a" type="7" fret={3} em={["♭7"]} title="7" caption="7 度を 1 フレット下げる" />
            <VoiceFig
              vid="shell-6a"
              type="m7"
              fret={3}
              em={["♭3"]}
              title="m7"
              caption="さらに 3 度を 1 フレット下げる"
            />
          </Figs>
          <p class="muted small">いちばん低い弦がルートのシェル。輪が動かした音で、ほかの指はそのまま。</p>
        </Tip>
        <Tip title="Ⅱ–Ⅴ–Ⅰ で 3 度と 7 度がつながる">
          Dm7 → G7 → CM7 では、Dm7 の 7 度（C）が G7 の 3 度（B）へ半音で下がり、G7 の 7 度（F）が CM7 の 3
          度（E）へ半音で下がる。シェルで弾くと、手をほとんど動かさずにこの流れが出る。
          <Fig title="3 度と 7 度の流れ">
            <Steps
              label="C → B → B"
              items={[
                { label: "C", sub: "Dm7 の ♭7" },
                { label: "B", sub: "G7 の 3", kind: "hl" },
                { label: "B", sub: "CM7 の 7" },
              ]}
              gaps={[{ label: "半音↓", hl: true }, { label: "＝" }]}
            />
            <Steps
              label="F → F → E"
              items={[
                { label: "F", sub: "Dm7 の ♭3" },
                { label: "F", sub: "G7 の ♭7" },
                { label: "E", sub: "CM7 の 3", kind: "hl" },
              ]}
              gaps={[{ label: "＝" }, { label: "半音↓", hl: true }]}
            />
          </Fig>
          {standard && (
            <Figs>
              <VoiceFig vid="shell-5a" type="m7" fret={5} title="Dm7" />
              <VoiceFig vid="shell-6a" type="7" fret={3} em={["3"]} title="G7" caption="3 弦が C → B" />
              <VoiceFig vid="shell-5a" type="M7" fret={3} em={["3"]} title="CM7" caption="4 弦が F → E" />
            </Figs>
          )}
        </Tip>
        <Tip title="弦のセットで分けて覚える">
          ドロップ 2 は「1〜4 弦」「2〜5 弦」「3〜6 弦」のどこに置くかで形が変わる（3 弦と 2 弦の間のずれのため）。1
          つのセットで M7・7・m7・m7(♭5) を全部覚えてから、次のセットへ。
          {standard && (
            <Figs>
              <VoiceFig vid="drop2-5" type="M7" fret={3} title="CM7（5〜2 弦）" caption="x3545x" />
              <VoiceFig
                vid="drop2-4"
                type="M7"
                fret={10}
                title="CM7（4〜1 弦）"
                caption="同じ並びでも、2 弦の音が 1 フレット先にずれて形が変わる"
              />
            </Figs>
          )}
        </Tip>
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>
          ドロップ 2 を「下から 2 番目を下げる」と覚える。下げるのは上から 2 番目
          <Figs>
            <Fig verdict="ok" caption="上から 2 番目の R を下げる → R 5 7 3">
              <Stack
                label="R 5 ♭7 3"
                tones={[
                  ["R", "G", "hl"],
                  ["5", "D"],
                  ["♭7", "F"],
                  ["3", "B"],
                ]}
              />
            </Fig>
            <Fig verdict="ng" caption="下から 2 番目の ♭7 を下げると、別の並びになる">
              <Stack
                label="♭7 5 R 3"
                tones={[
                  ["♭7", "F", "ng"],
                  ["5", "D"],
                  ["R", "G"],
                  ["3", "B"],
                ]}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          シェルで 5 度を残して 3 度を省く。省くのは 5 度（3 度が無いとメジャーかマイナーか分からない）
          <Figs>
            <Fig verdict="ok" caption="3 度（B）があるので G7 と分かる">
              <Stack
                label="G B F"
                tones={[
                  ["R", "G"],
                  ["3", "B", "hl"],
                  ["♭7", "F"],
                ]}
              />
            </Fig>
            <Fig verdict="ng" caption="G7 か Gm7 か決まらない">
              <Stack
                label="G D F"
                tones={[
                  ["R", "G"],
                  ["5", "D", "ng"],
                  ["♭7", "F"],
                ]}
              />
            </Fig>
          </Figs>
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>Dm7 → G7 → CM7 をシェルで弾き、3 度と 7 度がどの弦で半音動くかを確かめる</li>
          <li>ドロップ 2 の G7 を 1 つ覚えたら、3 度を半音下げて Gm7、7 度を半音上げて GM7 にする</li>
        </ul>
      </Section>
    </>
  );
}
