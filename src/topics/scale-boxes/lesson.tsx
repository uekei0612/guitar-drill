/* 参考の本文：スケールのボックス */
import { useContext } from "preact/hooks";
import { boxNotes } from ".";
import { boxesFor } from "../../chart/boxes";
import { scaleChart } from "../../chart/registry";
import type { Mark } from "../../drill/topic";
import type { Position } from "../../theory";
import { HScroll } from "../../ui/HScroll";
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";
import { Board, Fig, Figs, LessonBoard } from "../../ui/LessonFigures";

export function Intro() {
  return (
    <Points>
      <li>スケールの音を指板全体に並べると、4〜5 フレット幅の「ボックス（ポジション）」5 つに分けられる</li>
      <li>ボックス 1 は、6 弦のルートを人差し指で押さえる形。番号はそこから高い方へ 1・2・3・4・5</li>
      <li>隣のボックスとは端の音を共有していて、5 つで指板がつながる</li>
    </Points>
  );
}

/** 図はいつも A マイナーペンタ（設定の初期値）で描く */
const SCALE = "minor_pentatonic";
const ROOT = 9;
const same = (a: Position, b: Position) => a.string === b.string && a.fret === b.fret;
const degreeMarks = (ns: ReturnType<typeof boxNotes>): Mark[] =>
  ns.map(n => ({ pos: n.pos, kind: n.label === "R" ? "root" : "tone", label: n.label }));

export function Body() {
  const { tuning: t, lefty } = useContext(LessonBoard);
  const spans = boxesFor(scaleChart(SCALE)!, ROOT, t);
  // ペンタのボックスはどのチューニングでも 5 つ
  const [b1, b2] = [spans[0]!, spans[1]!];
  const range = (s: readonly [number, number]) => ({ minFret: s[0], maxFret: s[1] });
  const box1 = boxNotes(t, SCALE, ROOT, b1);
  const box2 = boxNotes(t, SCALE, ROOT, b2);
  const neckHi = Math.max(...spans.map(s => s[1]));
  const neck = boxNotes(t, SCALE, ROOT, [0, neckHi]);
  const rootStrings = [...new Set(box1.filter(n => n.label === "R").map(n => n.pos.string))].sort((a, b) => b - a);
  // ボックス 1 と 2 が共有する音
  const both = box1.filter(n => box2.some(m => same(m.pos, n.pos)));
  const pair = boxNotes(t, SCALE, ROOT, [b1[0], b2[1]]).map((n): Mark => ({
    pos: n.pos,
    kind: both.some(m => same(m.pos, n.pos)) ? "target" : n.label === "R" ? "root" : "tone",
    label: n.label,
  }));
  // 2 弦だけがボックスの外へ 1 フレット出る音（ほかの弦が使わないフレット）
  const outside = spans
    .map((span, i) => {
      const ns = boxNotes(t, SCALE, ROOT, span);
      const others = new Set(ns.filter(n => n.pos.string !== 2).map(n => n.pos.fret));
      const out = ns.find(n => n.pos.string === 2 && !others.has(n.pos.fret));
      return out && { i, span, ns, out };
    })
    .find(x => !!x);
  return (
    <>
      <Section title="仕組み">
        <p>
          スケールは同じ音名が 12 フレットごとに繰り返すので、指板の上の並びも 12
          フレットで一周する。その一周を、手を動かさずに弾ける幅（1 フレット 1 本の指で 4〜5
          フレット）ごとに区切ったのがボックス。
        </p>
        <Fig
          caption={`A マイナーペンタの 0〜${neckHi} フレット。色の帯がボックス 1〜5 で、隣どうしは重なりながら指板をつなぐ。横にスクロールできる`}
        >
          <HScroll startAtEnd={lefty}>
            <Board
              range={{ minFret: 0, maxFret: neckHi }}
              orientation="horizontal"
              scale={1}
              label="A マイナーペンタのボックス 1〜5"
              marks={degreeMarks(neck)}
              bands={spans.map((s, i) => ({ lo: s[0], hi: s[1], color: i, label: String(i + 1) }))}
            />
          </HScroll>
        </Fig>
        <p>
          ペンタトニック（5 音）は、どのボックスも各弦 2 音ずつ。メジャースケールなどの 7 音のスケールは、各弦 2〜3
          音になる。ペンタの形は 3 弦と 2 弦の間で 1 フレットずれるので、ボックスによっては 2 弦だけ 1
          フレット外に出る。
        </p>
        <p>
          マイナーペンタとメジャーペンタは、同じ音の並びを別の音から数えたもの（A マイナーペンタ＝C
          メジャーペンタ）。形は同じで、ルートの位置（と番号）がずれる。
        </p>
        <Figs wide>
          <Fig title="A マイナーペンタ" caption="ボックス 1。A が R">
            <Board
              range={range(b1)}
              orientation="horizontal"
              label="A マイナーペンタのボックス 1"
              marks={degreeMarks(box1)}
            />
          </Fig>
          <Fig title="C メジャーペンタ" caption="点の位置は同じ。C が R になり、度数の読み方が変わる">
            <Board
              range={range(b1)}
              orientation="horizontal"
              label="同じ位置の C メジャーペンタ"
              marks={degreeMarks(boxNotes(t, "major_pentatonic", 0, b1))}
            />
          </Fig>
        </Figs>
      </Section>
      <Tips>
        <Tip title="まずボックス 1 だけを完全に">
          マイナーペンタのボックス 1 は、6 弦・4 弦・1 弦にルートがある。A なら 5 フレットから 8
          フレット。ここを弾けるようになれば、ほかの 4 つは「つながった続き」として覚えられる。
        </Tip>
        <Tip title="ルートの位置で形をつかむ">
          形を点の集まりとして覚えるより、「どの弦のどこにルートがあるか」で覚える。弾くときもルートを意識すると、キーが変わってもすぐ置ける。
          <Fig
            caption={`ボックス 1 の R は ${rootStrings.map(s => `${s} 弦`).join("・")}。まずこの点を置いてから、まわりの音を足す`}
          >
            <Board
              range={range(b1)}
              orientation="horizontal"
              label="ボックス 1 のルート"
              marks={box1.map(n => ({ pos: n.pos, kind: n.label === "R" ? "root" : "hint", label: n.label }))}
            />
          </Fig>
        </Tip>
        <Tip title="隣のボックスは端の音を共有">
          ボックス 1 の右端の音は、ボックス 2 の左端の音。隣のボックスへは、共有している音を足場に移る。
          <Fig caption="輪の音がボックス 1 と 2 の両方に入っている音。ここを足場に手を移す">
            <Board
              range={{ minFret: b1[0], maxFret: b2[1] }}
              orientation="horizontal"
              label="ボックス 1 と 2 の共有する音"
              marks={pair}
              bands={[
                { lo: b1[0], hi: b1[1], color: 0, label: "1" },
                { lo: b2[0], hi: b2[1], color: 1, label: "2" },
              ]}
            />
          </Fig>
        </Tip>
        <Tip title="指は 1 フレット 1 本">
          ボックスの左端を人差し指、右端を小指（または薬指）にして、手の位置を動かさずに弾く。
          <Fig caption="数字は押さえる指（1＝人差し指、2＝中指、3＝薬指、4＝小指）。フレットごとに指が決まる">
            <Board
              range={range(b1)}
              orientation="horizontal"
              label="ボックス 1 の指づかい"
              marks={box1.map(n => ({
                pos: n.pos,
                kind: n.label === "R" ? "root" : "tone",
                label: String(Math.min(4, n.pos.fret - b1[0] + 1)),
              }))}
            />
          </Fig>
        </Tip>
      </Tips>
      <Pitfalls>
        <li>
          ボックスの形だけ覚えて、ルートがどこか分からない。弾くたびにルートを声に出す
          <Figs wide>
            <Fig verdict="ok" caption="R の位置と度数が分かっている">
              <Board range={range(b1)} orientation="horizontal" label="R の分かるボックス" marks={degreeMarks(box1)} />
            </Fig>
            <Fig verdict="ng" caption="点の形だけ。キーが変わると置けない">
              <Board
                range={range(b1)}
                orientation="horizontal"
                label="形だけのボックス"
                marks={box1.map(n => ({ pos: n.pos, kind: "hint" }))}
              />
            </Fig>
          </Figs>
        </li>
        <li>
          ボックスの外に出る 2 弦の音（ペンタのボックス 3 など）を落とす
          {outside && (
            <Figs wide>
              <Fig verdict="ok" caption={`ボックス ${outside.i + 1}。2 弦だけ 1 フレット外に出る（輪）`}>
                <Board
                  range={range(outside.span)}
                  orientation="horizontal"
                  label={`ボックス ${outside.i + 1} の 2 弦の音`}
                  marks={outside.ns.map(n => ({
                    pos: n.pos,
                    kind: same(n.pos, outside.out.pos) ? "target" : n.label === "R" ? "root" : "tone",
                    label: n.label,
                  }))}
                />
              </Fig>
              <Fig verdict="ng" caption="ほかの弦と同じ幅だけで弾くと、点線の音が抜ける">
                <Board
                  range={range(outside.span)}
                  orientation="horizontal"
                  label={`2 弦の音を落としたボックス ${outside.i + 1}`}
                  marks={degreeMarks(outside.ns.filter(n => !same(n.pos, outside.out.pos)))}
                  missed={[outside.out.pos]}
                />
              </Fig>
            </Figs>
          )}
        </li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>1 つのボックスを、6 弦から 1 弦へ上り、1 弦から 6 弦へ下る。ルートで一度止まる</li>
          <li>ボックス 1 → 2 → … → 5 と、共有する音でつなぎながら指板を端まで移動する</li>
          <li>
            チャートで同じスケールとキーを開き、ボックスを 1 つずつ選んで形を見比べる（上の「チャートで開く」から）
          </li>
        </ul>
      </Section>
    </>
  );
}
