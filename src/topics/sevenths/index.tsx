/* 分野：4和音の構成音。M7・7・m7・m7(♭5) から始め、dim7・mM7・6 などを設定で足す。 */
import { chordTonesTopic } from "../chord-tones";
import * as lesson from "./lesson";

export const sevenths = chordTonesTopic({
  id: "sevenths",
  level: "intermediate",
  title: "4和音の構成音",
  intro: "4和音はトライアドに 7 度（または 6 度）を足した 4 音。7 度が長 7 度（7）か短 7 度（♭7）かで型が分かれる。",
  lesson,
  base: ["M7", "7", "m7", "m7b5"],
  groups: [
    { key: "dim7", label: "dim7", types: ["dim7"] },
    { key: "minorMajor", label: "mM7・augM7・aug7", types: ["mM7", "augM7", "aug7"] },
    { key: "sixth", label: "6・m6", types: ["6", "m6"] },
    { key: "sus", label: "7sus4", types: ["7sus4"] },
  ],
});
