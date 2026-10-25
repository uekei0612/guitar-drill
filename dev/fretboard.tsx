import { render } from "preact";
import { useState } from "preact/hooks";
import type { Mark } from "../src/drill/topic";
import "../src/style.css";
import {
  STANDARD,
  type Position,
  degreeLabel,
  intervalBetween,
  note,
  pcAt,
  scaleNotes,
  spellings,
} from "../src/theory";
import { Fretboard } from "../src/ui/Fretboard";

const lefty = new URLSearchParams(location.search).has("lefty");
const root = note("A");
const scale = scaleNotes("minor_pentatonic", root);
const box = { minFret: 5, maxFret: 8 };

const marks: Mark[] = [];
for (let s = 1; s <= 6; s++)
  for (let f = box.minFret; f <= box.maxFret; f++) {
    const n = scale.find(x =>
      spellings(pcAt(STANDARD, { string: s, fret: f })).some(y => y.letter === x.letter && y.acc === x.acc),
    );
    if (n) {
      const label = degreeLabel(intervalBetween(root, n));
      marks.push({ pos: { string: s, fret: f }, kind: label === "R" ? "root" : "tone", label });
    }
  }

function Demo() {
  const [sel, setSel] = useState<Position[]>([]);
  return (
    <main>
      <h2>A マイナーペンタ ボックス 1</h2>
      <Fretboard tuning={STANDARD} range={box} label="A マイナーペンタ ボックス 1" marks={marks} lefty={lefty} />
      <h2>問題：? は何度？</h2>
      <Fretboard
        tuning={STANDARD}
        range={{ minFret: 4, maxFret: 9 }}
        label="問題"
        lefty={lefty}
        marks={[
          { pos: { string: 6, fret: 5 }, kind: "hint", label: "R" },
          { pos: { string: 4, fret: 7 }, kind: "target" },
          { pos: { string: 3, fret: 5 }, kind: "ok" },
          { pos: { string: 2, fret: 6 }, kind: "wrong" },
        ]}
      />
      <h2>A を全部タップ（{sel.length}）</h2>
      <Fretboard
        tuning={STANDARD}
        range={{ minFret: 0, maxFret: 12 }}
        label="指板"
        lefty={lefty}
        selected={sel}
        onTap={p =>
          setSel(s =>
            s.some(q => q.string === p.string && q.fret === p.fret)
              ? s.filter(q => q.string !== p.string || q.fret !== p.fret)
              : [...s, p],
          )
        }
      />
    </main>
  );
}

render(<Demo />, document.getElementById("app")!);
