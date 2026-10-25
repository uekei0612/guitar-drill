/* 分野：トライアドの構成音。メジャー・マイナーから始め、dim・aug・sus を設定で足す。 */
import { chordTonesTopic } from "../chord-tones";

export const triads = chordTonesTopic({
  id: "triads",
  level: "beginner",
  title: "トライアドの構成音",
  intro: "トライアドはルートに 3 度と 5 度を重ねた 3 音。3 度と 5 度の高さで型が決まる。",
  base: ["maj", "m"],
  groups: [
    { key: "dim", label: "dim（ディミニッシュ）", types: ["dim"] },
    { key: "aug", label: "aug（オーギュメント）", types: ["aug"] },
    { key: "sus", label: "sus2・sus4", types: ["sus2", "sus4"] },
  ],
});
