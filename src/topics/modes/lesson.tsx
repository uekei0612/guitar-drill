/* 参考の本文：モードの特性音 */
import { Pitfalls, Points, Section, Tip, Tips } from "../../ui/Lesson";

export function Intro() {
  return (
    <Points>
      <li>7 つのモードは、どれもメジャースケールの 7 音を別の音から並べ直したもの</li>
      <li>
        比べる相手は 2 つだけ：明るい系は<strong>メジャー（アイオニアン）</strong>、暗い系は
        <strong>ナチュラルマイナー（エオリアン）</strong>
      </li>
      <li>
        比べたときに違う 1 音が<strong>特性音</strong>。その音を鳴らすとそのモードらしく聞こえる
      </li>
    </Points>
  );
}

export function Body() {
  return (
    <>
      <Section title="仕組み">
        <p>
          C メジャースケール（C D E F G A B）を D から並べると D ドリアン、E からならフリジアン、F からならリディアン、G
          からならミクソリディアン、A からならエオリアン（ナチュラルマイナー）、B
          からならロクリアン。使う音は同じでも、主音が変わると全音・半音の並び方が変わり、響きが変わる。
        </p>
        <table class="ref-table">
          <thead>
            <tr>
              <th scope="col">モード</th>
              <th scope="col">比べる相手</th>
              <th scope="col">特性音</th>
              <th scope="col">合うコード</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>リディアン</td>
              <td>メジャー</td>
              <td>♯4</td>
              <td>M7（♯11）</td>
            </tr>
            <tr>
              <td>アイオニアン</td>
              <td>（メジャーそのもの）</td>
              <td>—</td>
              <td>M7</td>
            </tr>
            <tr>
              <td>ミクソリディアン</td>
              <td>メジャー</td>
              <td>♭7</td>
              <td>7</td>
            </tr>
            <tr>
              <td>ドリアン</td>
              <td>ナチュラルマイナー</td>
              <td>6</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>エオリアン</td>
              <td>（ナチュラルマイナーそのもの）</td>
              <td>—</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>フリジアン</td>
              <td>ナチュラルマイナー</td>
              <td>♭2</td>
              <td>m7</td>
            </tr>
            <tr>
              <td>ロクリアン</td>
              <td>ナチュラルマイナー</td>
              <td>♭2・♭5</td>
              <td>m7(♭5)</td>
            </tr>
          </tbody>
        </table>
      </Section>
      <Tips>
        <Tip title="明るい順に 1 音ずつ ♭ が増える">
          リディアン → アイオニアン → ミクソリディアン → ドリアン → エオリアン → フリジアン → ロクリアン。右へ 1
          つ進むごとに、どこか 1 音が半音下がる。並びを覚えれば、隣のモードとの違いが 1 音で分かる。
        </Tip>
        <Tip title="親のメジャーキーを探す">
          X ドリアンは X の全音下のメジャー、フリジアンは長 3 度下、リディアンは 4 度下、ミクソリディアンは 4
          度上、エオリアンは短 3 度上、ロクリアンは半音上のメジャーと同じ音（D ドリアン → C、E フリジアン → C、G
          ミクソリディアン → C）。
        </Tip>
        <Tip title="コードの型でまず 2 つに分ける">
          3 度が長い（メジャー系）か短い（マイナー系）かで分け、次に特性音で決める。7
          のコードならミクソリディアン、m7(♭5) ならロクリアン。
        </Tip>
      </Tips>
      <Pitfalls>
        <li>「D ドリアン＝C メジャー」と覚えて、C から弾いてしまう。主音は D。D を中心に、D の上で鳴らす</li>
        <li>特性音を探すとき、比べる相手を間違える（ドリアンはメジャーではなく、ナチュラルマイナーと比べる）</li>
      </Pitfalls>
      <Section title="練習のしかた">
        <ul>
          <li>同じ主音（たとえば A）で、A エオリアンと A ドリアンを続けて弾き、6 度の 1 音の違いを聴く</li>
          <li>
            ルートの音（開放弦など）を鳴らしっぱなしにして、その上でモードを弾き、特性音で響きが変わるのを確かめる
          </li>
        </ul>
      </Section>
    </>
  );
}
