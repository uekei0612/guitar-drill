/* 参考の本文：開放弦の音名 */
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";

export function Intro({ standard }: { standard: boolean }) {
  return (
    <Points>
      <li>弦は細い順に 1 弦〜6 弦と数える。いちばん太い（音の低い）弦が 6 弦</li>
      {standard ? (
        <li>
          レギュラーチューニングは 6 弦から <strong>E A D G B E</strong>（ミ ラ レ ソ シ ミ）
        </li>
      ) : (
        <li>今の設定のチューニングの開放弦は、下の図と表のとおり</li>
      )}
      <li>開放弦の音名は、指板のすべての音を数える出発点になる</li>
    </Points>
  );
}

export function Body({ standard }: { standard: boolean }) {
  return (
    <>
      <Section title="仕組み">
        <p>
          開放弦は、どこも押さえずに鳴らした音。フレットを 1
          つ押さえるごとに半音ずつ高くなるので、開放弦の音名が分かれば、 そこから数えて指板のどの音でも分かる。
        </p>
        {standard && (
          <p>
            隣り合う弦の音の差は、ほとんどが 4 度（半音 5 つ）。3 弦（G）と 2 弦（B）の間だけが長 3 度（半音 4
            つ）で、ここでだけ並びがずれる。このずれは、あとで習うオクターブの形やスケールの形にも出てくる。
          </p>
        )}
      </Section>
      {standard ? (
        <Tips>
          <Tip title="両端は同じ E">
            1 弦と 6 弦はどちらも E（2 オクターブ違い）。覚えるのは間の 4 つ（A D G B）だけ。
          </Tip>
          <Tip title="語呂で覚える">
            英語圏の定番は「<strong>E</strong>at <strong>A</strong> <strong>D</strong>og, <strong>G</strong>ood{" "}
            <strong>B</strong>ye <strong>E</strong>
            ddie」。日本語なら「ミ・ラ・レ・ソ・シ・ミ」と声に出して何度か弾くのが早い。
          </Tip>
          <Tip title="5 フレットは次の弦の開放">
            6 弦の 5 フレットは 5 弦の開放と同じ A。同じように 5 弦 5 フレット＝D、4 弦 5 フレット＝G。3 弦だけは 4
            フレットで 2 弦の開放（B）になる。チューニングを合わせるときにも使う関係。
          </Tip>
        </Tips>
      ) : (
        <StandardOnly />
      )}
      <Pitfalls>
        <li>
          「1 弦」は構えたときに<strong>いちばん下</strong>にある細い弦。上にある太い弦が 6 弦（TAB 譜は上の線が 1 弦）
        </li>
        <li>開放の音名と、その弦の 12 フレットの音名は同じ（1 オクターブ上）。別の音と思わない</li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>開放弦を 6 弦から順に鳴らしながら、音名を声に出す。慣れたら 1 弦から逆に</li>
          <li>弦の番号をでたらめに言ってもらい（または自分で決め）、すぐ音名を答える</li>
        </ul>
      </Section>
    </>
  );
}
