/* 参考の本文：トライアドの構成音 */
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";

export function Intro() {
  return (
    <Points>
      <li>トライアドは、ルートの上に 3 度を 2 つ重ねた 3 音（R・3 度・5 度）</li>
      <li>
        メジャー＝<strong>R 3 5</strong>、マイナー＝<strong>R ♭3 5</strong>。違いは 3 度の半音 1 つだけ
      </li>
      <li>音名はアルファベットを 1 つ飛ばしで並べ（C E G）、♯・♭ で高さを合わせる</li>
    </Points>
  );
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          3 度には、長 3 度（半音 4 つ）と短 3 度（半音 3 つ）の 2 種類がある。この 2
          つをどう重ねるかで、トライアドの型が決まる。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">型</th>
              <th scope="col">重ね方（下から）</th>
              <th scope="col">響き</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>メジャー（R 3 5）</td>
              <td>長 3 度 ＋ 短 3 度</td>
              <td>明るい</td>
            </tr>
            <tr>
              <td>マイナー（R ♭3 5）</td>
              <td>短 3 度 ＋ 長 3 度</td>
              <td>暗い</td>
            </tr>
            <tr>
              <td>dim（R ♭3 ♭5）</td>
              <td>短 3 度 ＋ 短 3 度</td>
              <td>不安定・緊張</td>
            </tr>
            <tr>
              <td>aug（R 3 ♯5）</td>
              <td>長 3 度 ＋ 長 3 度</td>
              <td>浮いた感じ</td>
            </tr>
          </tbody>
        </table>
        <p>
          sus4（R 4 5）と sus2（R 2 5）は 3 度の代わりに 4 度・2 度を使う形で、明るくも暗くもない。sus4 は 3
          度へ戻りたがる響きで、よく元のコードの前に置かれる。
        </p>
      </Section>
      <Tips>
        <Tip title="アルファベットを 1 つ飛ばし">
          C D E F G A B を 1 つ飛ばしで 3 つ取ると、どのトライアドも文字が決まる：C E G、D F A、E G B、F A C、G B D、A C
          E、B D F。あとは型に合わせて ♯・♭ を付ける（D メジャーは D F♯ A）。
        </Tip>
        <Tip title="♯・♭ なしで済むものを覚える">
          そのままでメジャーなのは C・F・G、マイナーなのは Dm・Em・Am、dim なのは Bdim。ほかはここから 1 音ずらすだけ（E
          は Em の G を G♯ に）。
        </Tip>
        <Tip title="5 度は半音 7 つ（ほぼいつも同じ）">
          完全 5 度は、ルートの 7 フレット先。レギュラーチューニングなら、隣の太い弦の同じフレットか、隣の細い弦の 2
          フレット先（3 弦 → 2 弦は 3 フレット先）にも同じ音名がある。♭5 になるのは dim、♯5 になるのは aug だけ。
        </Tip>
      </Tips>
      <Pitfalls>
        <li>E♭m の 3 度を F♯ と書く。文字は E の 1 つ飛ばしで G なので、G♭ と書く（音の高さは同じ）</li>
        <li>メジャーとマイナーを、5 度の違いだと思う。違うのは 3 度だけ</li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>C から順に、12 のルートのメジャーとマイナーを声に出して言う（C E G、Cm は C E♭ G…）</li>
          <li>
            ギターでコードを押さえたら、各弦の音が R・3・5 のどれかを言ってみる（ローコードの参考の「度数」表示が答え）
          </li>
        </ul>
      </Section>
    </>
  );
}
