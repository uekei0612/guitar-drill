/* 参考の本文：4和音の構成音 */
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";

export function Intro() {
  return (
    <Points>
      <li>4 和音は、トライアドにもう 1 つ 3 度を重ねて 7 度を足した 4 音</li>
      <li>
        7 度は 2 種類：<strong>長 7 度（7）＝ルートの半音下</strong>、<strong>短 7 度（♭7）＝ルートの全音下</strong>
      </li>
      <li>
        基本の 4 つ：<strong>M7（R 3 5 7）・7（R 3 5 ♭7）・m7（R ♭3 5 ♭7）・m7(♭5)（R ♭3 ♭5 ♭7）</strong>
      </li>
    </Points>
  );
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          名前は「トライアドの型 ＋ 7 度の種類」で読む。M（メジャー）が付くのは 7 度が長 7
          度のとき、何も付かない「7」は短 7 度。トライアド部分のマイナーの m と、7 度の M を混同しない。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">記号</th>
              <th scope="col">読み</th>
              <th scope="col">トライアド ＋ 7 度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CM7（Cmaj7・C△7）</td>
              <td>メジャーセブンス</td>
              <td>メジャー ＋ 長 7 度</td>
            </tr>
            <tr>
              <td>C7</td>
              <td>セブンス（ドミナントセブンス）</td>
              <td>メジャー ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cm7</td>
              <td>マイナーセブンス</td>
              <td>マイナー ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cm7(♭5)（Cø）</td>
              <td>マイナーセブンスフラットファイブ</td>
              <td>dim ＋ 短 7 度</td>
            </tr>
            <tr>
              <td>Cdim7（C°7）</td>
              <td>ディミニッシュセブンス</td>
              <td>dim ＋ 減 7 度（♭♭7＝6 と同じ高さ）</td>
            </tr>
            <tr>
              <td>CmM7</td>
              <td>マイナーメジャーセブンス</td>
              <td>マイナー ＋ 長 7 度</td>
            </tr>
          </tbody>
        </table>
        <p>6・m6 は 7 度の代わりに 6 度を足した形（C6＝C E G A）。7sus4 は sus4 に短 7 度を足した形（C F G B♭）。</p>
        <p>
          メジャーキーの中のコード（ダイアトニックコード）は、基本の 4 つでできている：ⅠM7 Ⅱm7 Ⅲm7 ⅣM7 Ⅴ7 Ⅵm7
          Ⅶm7(♭5)。だからこの 4 つをまず確実にする。
        </p>
      </Section>
      <Tips>
        <Tip title="7 度は上ではなく下から数える">
          長 7 度は半音 11 個上＝ルートの半音下、短 7 度は半音 10 個上＝ルートの全音下。C なら B（M7）と
          B♭（7）。フレットでも、ルートの 1・2 フレット手前（オクターブ上なら 11・10 フレット先）。
        </Tip>
        <Tip title="4 つの文字も 1 つ飛ばし">
          トライアドと同じく、アルファベットを 1 つ飛ばしで 4 つ：C E G B、D F A C、G B D F。G7 は ♯・♭ なしで G B D F。
        </Tip>
        <Tip title="dim7 は 3 フレットごとに同じ形">
          dim7 は短 3 度だけを重ねた形なので、音が 3 フレットずつ等間隔に並ぶ。Cdim7・E♭dim7・G♭dim7・Adim7 は同じ 4
          音。
        </Tip>
        <Tip title="7th（ドミナント）は解決したがる">
          C7 の 3 度（E）と ♭7（B♭）は、半音 6 つ（増 4 度）離れていて不安定。次の F
          へ進むと落ち着く。響きでも区別できるようにする。
        </Tip>
      </Tips>
      <Pitfalls>
        <li>C7 を「C メジャーセブンス」と読む。M の付かない 7 は短 7 度（B♭）</li>
        <li>Cm7 の m を 7 度のことだと思う。m はトライアド（3 度）がマイナーという意味</li>
        <li>dim7 の 7 度を ♭7 と書く。dim7 は ♭♭7（C なら B𝄫）で、m7(♭5) とは 7 度が違う</li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>1 つのルート（たとえば G）で、基本の 4 つを続けて言う：G B D F♯、G B D F、G B♭ D F、G B♭ D♭ F</li>
          <li>ギターで押さえるときは、どの弦が 7 度かを探す。7 度の 1 音を替えるだけで M7 ↔ 7 が切り替わる</li>
        </ul>
      </Section>
    </>
  );
}
