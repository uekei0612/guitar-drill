/* 参考の本文：五度圏と調号 */
import { Pitfalls, Points, Section, StandardOnly, Tip, Tips } from "../../ui/Lesson";

export function Intro() {
  return (
    <Points>
      <li>五度圏は、12 のキーを 5 度ずつ並べた円。時計回りに 1 つ進むごとに ♯ が 1 つ増え、反時計回りは ♭ が増える</li>
      <li>
        ♯ の付く順は <strong>F C G D A E B</strong>（ファドソレラミシ）、♭ はその逆の <strong>B E A D G C F</strong>
      </li>
      <li>隣どうしのキーは調号が 1 つしか違わない＝よく似た（近い）キー</li>
    </Points>
  );
}

export function Body({ standard }: { standard: boolean }) {
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャー（調号なし）の 5 度上の G メジャーでは、F が F♯ になる。さらに 5 度上の D では C も ♯
          になる。こうして 5 度上がるたびに ♯ が 1 つずつ増える。逆に 5 度下（4 度上）へ進むと ♭ が 1 つずつ増える（F は
          B♭、B♭ は B♭ と E♭）。
        </p>
        <h3>五度圏の使い道</h3>
        <ul>
          <li>キーの調号の数がすぐ分かる</li>
          <li>
            メジャーキーの <strong>Ⅳ は左隣（反時計回り）、Ⅴ は右隣（時計回り）</strong>。C なら F と G。Ⅰ–Ⅳ–Ⅴ
            がひと目で分かる
          </li>
          <li>内側の平行調（調号が同じマイナー）で、Ⅵm も分かる（C の内側の Am）</li>
          <li>
            Ⅴ7 → Ⅰ のように 5 度下へ進む流れは、円を反時計回りに 1 つ進むこと。Ⅵ → Ⅱ → Ⅴ → Ⅰ は 3 回続けて反時計回り（C
            なら A → D → G → C）
          </li>
        </ul>
      </Section>
      <Tips>
        <Tip title="♯ のキーは最後の ♯ の半音上">♯ 3 つなら F♯ C♯ G♯ で、最後の G♯ の半音上の A がメジャーの主音。</Tip>
        <Tip title="♭ のキーは最後から 2 つ目の ♭">
          ♭ 3 つなら B♭ E♭ A♭ で、最後から 2 つ目の E♭ が主音。♭ 1 つだけは例外で F と覚える。
        </Tip>
        <Tip title="マイナーは短 3 度下（6 番目の音）">
          同じ調号のマイナーは、メジャーの主音から短 3 度下（メジャースケールの 6 番目）。C → Am、G → Em、F → Dm。
        </Tip>
        {standard && (
          <Tip title="ギターの上で五度圏を回る">
            6 弦のある音から 5 弦の同じフレットへ移ると 4 度上＝反時計回りに 1 つ（6 弦 3 フレットの G → 5 弦 3
            フレットの C）。逆に 5 弦 → 6 弦の同じフレットは時計回り。
          </Tip>
        )}
      </Tips>
      {!standard && <StandardOnly />}
      <Pitfalls>
        <li>♯ と ♭ の付く順を混ぜる。♭ は ♯ の順を逆から読んだもの（B E A D G C F）</li>
        <li>平行調（C と Am：調号が同じ）と、同主調（C と Cm：主音が同じ）を混同する。Cm の調号は ♭ 3 つ</li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C から時計回りに C G D A E B F♯、反時計回りに C F B♭ E♭ A♭ D♭ G♭ を声に出して一周する</li>
          <li>キーを 1 つ選び、調号の数・付く音・平行調・Ⅳ・Ⅴ を続けて言う（D：♯ 2 つ、F♯ C♯、Bm、G、A）</li>
        </ul>
      </Section>
    </>
  );
}
