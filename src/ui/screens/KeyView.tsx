/* キー（五度圏とダイアトニックコード）。キーを選ぶと、そのキーのコード 7 つが五度圏の扇形に収まるのが見え、
   札を押すとコードが鳴る。状態は URL（#/key?…）に持つので、リロードやリンクで同じ表示に戻る。 */
import { useEffect, useRef, useState } from "preact/hooks";
import { playChords, playMidi, scaleMidis, voiced } from "../../chart/audio";
import { arpeggioIdOf } from "../../chart/registry";
import { DEFAULT_CHART, toParams as chartParams } from "../../chart/state";
import { useData } from "../../state";
import {
  type DiatonicChord,
  type Key,
  FIFTHS,
  KEYS,
  fmt,
  keyId,
  keyLabel,
  keySignature,
  mod,
  note,
  pc,
  scaleNotes,
  STANDARD,
  type Tuning,
  pcAt,
  stringCount,
  tuningById,
} from "../../theory";
import { accidentals, relative, sigLabel } from "../../topics/circle-of-fifths";
import {
  type Func,
  type KeyViewState,
  type Place,
  type Ring,
  DEFAULT_KEY_VIEW,
  changedNotes,
  chordsOf,
  fromParams,
  funcOf,
  MAX_CUSTOM,
  inFan,
  keyAt,
  progChords,
  progressionsFor,
  rootMotion,
  placeOf,
  qualityOf,
  scaleOfKey,
  slotOf,
  toParams,
} from "../../keyview/state";
import {
  type KeyPrintOptions,
  type PrintChords,
  buildKeyPrintPages,
  keyPrintFileName,
  keyPrintPageCount,
} from "../../keyview/pdf";
import type { Mark } from "../../drill/topic";
import { Fretboard } from "../Fretboard";
import { HScroll } from "../HScroll";
import { PdfPreview } from "../PdfPreview";
import { outputPdf } from "../pdf-output";
import { href } from "../route";
import { STORAGE_KEY } from "../../store/store";

const ALL_KEYS: readonly Key[] = [...KEYS.major, ...KEYS.minor];

/** 同主調（主音が同じで、メジャーとマイナーが逆）。異名同音は一覧にある綴りで（C♯ でなく D♭） */
const parallel = (k: Key): Key =>
  ALL_KEYS.find(x => x.mode !== k.mode && pc(x.tonic) === pc(k.tonic)) ?? {
    ...k,
    mode: k.mode === "major" ? "minor" : "major",
  };

const MODE_TEXT: Readonly<Record<Key["mode"], string>> = { major: "メジャー", minor: "マイナー" };

/** 選択欄のキーの名前（省略しない：C メジャー（♯♭なし）、F♯ マイナー（♯3つ）） */
const keyOptionText = (k: Key) => {
  const n = keySignature(k);
  return `${fmt(k.tonic)} ${MODE_TEXT[k.mode]}（${n ? sigLabel(n) : "♯♭なし"}）`;
};

const sigText = (k: Key) => {
  const n = keySignature(k);
  return `調号${sigLabel(n)}${n ? `（${accidentals(n).join(" ")}）` : ""}`;
};

const FUNC_TEXT: Readonly<Record<Func, string>> = {
  T: "トニック：落ち着く、帰ってくる場所",
  SD: "サブドミナント：少し離れて、動き出す感じ",
  D: "ドミナント：緊張して、Ⅰ へ戻りたがる",
};

const QUALITY_CLASS: Readonly<Record<Ring, string>> = { major: "maj", minor: "min", dim: "dim" };

/** 札の幅に収まらないときは、型の切れ目で折る（Bm7 / (♭5)、E♯ / dim7） */
const breakable = (symbol: string) => symbol.replace("(", "\u200b(").replace("dim", "\u200bdim");

const chordMidis = (c: DiatonicChord) => voiced(pc(c.root), c.tones.map(pc));

/* 五度圏の寸法（viewBox 360 × 360） */
const S = 360,
  C = S / 2;
const RADIUS: Readonly<Record<Ring, number>> = { major: 146, minor: 100, dim: 60 };
const CELL: Readonly<Record<Ring, number>> = { major: 23, minor: 19, dim: 20 };
/** 位置 i（C = 0 が真上、時計回り）の点 */
const pt = (i: number, r: number) => {
  const a = (i * Math.PI) / 6;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
/** 扇形の半径（外・中・内）と、内の輪の幅の半分の角度 */
const FAN_SIZE = { o: 174, m: 80, i: 36, w: 21 };
/** 真上（位置 0）を真ん中にした扇形。外と中の輪は 3 つ分、内の輪は 1 つ分（dim の丸がはみ出さないよう、少し広く） */
const FAN = (() => {
  const p = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
  };
  const { o, m, i, w } = FAN_SIZE;
  return [
    `M ${p(-45, o)}`,
    `A ${o} ${o} 0 0 1 ${p(45, o)}`,
    `L ${p(45, m)}`,
    `A ${m} ${m} 0 0 0 ${p(w, m)}`,
    `L ${p(w, i)}`,
    `A ${i} ${i} 0 0 0 ${p(-w, i)}`,
    `L ${p(-w, m)}`,
    `A ${m} ${m} 0 0 0 ${p(-45, m)}`,
    "Z",
  ].join(" ");
})();

/** 扇形の回転（度）。前の向きから近いほうへ回るよう、角度を積み上げる。
    ドラッグで回したあとは、離したときの角度を入れておくと、そこから近いキーへ回る */
function useFanAngle(slot: number) {
  const ref = useRef(slot * 30);
  ref.current += mod(slot * 30 - ref.current + 180, 360) - 180;
  return ref;
}

/** -180〜180 度に */
const wrap = (deg: number) => mod(deg + 180, 360) - 180;

/** viewBox の点の、中心から見た向き（真上が 0、時計回りの度）と半径 */
const polar = (x: number, y: number) => ({
  deg: (Math.atan2(x - C, C - y) * 180) / Math.PI,
  r: Math.hypot(x - C, y - C),
});

/** 点が扇形（angle 度に回したもの）の上か */
const onFan = (x: number, y: number, angle: number) => {
  const { deg, r } = polar(x, y);
  const d = Math.abs(wrap(deg - angle));
  const { o, m, i, w } = FAN_SIZE;
  return (r >= m && r <= o && d <= 45) || (r >= i && r < m && d <= w);
};

/** これ以上動いたらドラッグ（px）。指の小さなぶれではコードを鳴らせるように */
const DRAG_PX = 8;

/** 扇形を 1 度でも回したか（回したら「回すとキーが変わる」の案内を出さない）。保存できなくても落ちない */
const TURNED_KEY = `${STORAGE_KEY}:fan-turned`;
const readTurned = () => {
  try {
    return localStorage.getItem(TURNED_KEY) === "1";
  } catch {
    return false;
  }
};
const saveTurned = () => {
  try {
    localStorage.setItem(TURNED_KEY, "1");
  } catch {
    /* 保存できなければ、次に開いたときにまた案内を出すだけ */
  }
};

/** 進行の矢印（コードからコードへ）。進む向きの左へ少しふくらませるので、行きと帰りの矢印は重ならない。
    鳴らしているあいだは、今のコードへ入る矢印だけを濃くする */
function ProgArrows({
  path,
  playing,
  marker,
}: {
  path: readonly DiatonicChord[];
  playing: number | null;
  marker: string;
}) {
  const ps = path.map(placeOf);
  return (
    <g class={`kv-arrows${playing != null ? " playing" : ""}`} aria-hidden="true">
      {ps.slice(1).map((b, i) => {
        const a = ps[i]!;
        if (a.ring === b.ring && a.slot === b.slot) return null;
        const pa = pt(a.slot, RADIUS[a.ring]),
          pb = pt(b.slot, RADIUS[b.ring]);
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
        const u = { x: (pb.x - pa.x) / len, y: (pb.y - pa.y) / len };
        const st = { x: pa.x + u.x * (CELL[a.ring] + 2), y: pa.y + u.y * (CELL[a.ring] + 2) };
        const en = { x: pb.x - u.x * (CELL[b.ring] + 7), y: pb.y - u.y * (CELL[b.ring] + 7) };
        const bend = Math.min(18, len * 0.18);
        const ctl = { x: (st.x + en.x) / 2 + u.y * bend, y: (st.y + en.y) / 2 - u.x * bend };
        return (
          <path
            key={i}
            class={playing === i + 1 ? "now" : undefined}
            d={`M ${st.x} ${st.y} Q ${ctl.x} ${ctl.y} ${en.x} ${en.y}`}
            marker-end={`url(#${marker})`}
          />
        );
      })}
    </g>
  );
}

function KeyCircle({
  s: given,
  chords: givenChords,
  path: givenPath = [],
  playing: givenPlaying = null,
  onPick,
  onChord,
  onTurned,
  mini = false,
}: {
  s: KeyViewState;
  chords: readonly DiatonicChord[];
  /** 進行（矢印でつなぐ） */
  path?: readonly DiatonicChord[];
  /** 鳴らしている進行のコード（path の何番目か） */
  playing?: number | null;
  onPick?: (k: Key) => void;
  /** キーのコード（扇形の中と、借りたコード）を押したとき。札を押したのと同じ */
  onChord?: (c: DiatonicChord) => void;
  /** 扇形をドラッグで回してキーを変えたとき */
  onTurned?: () => void;
  /** 進行のそばに出す小さな写し（押せない。読み上げない） */
  mini?: boolean;
}) {
  const fan = useFanAngle(slotOf(given.key));
  const svg = useRef<SVGSVGElement>(null);
  /** 扇形のドラッグ。扇の上で押して動かすと、扇が指について回り、離すといちばん近いキーで止まる。
      回しているあいだは、行き先のキーのコードを扇の中に出す */
  const [turn, setTurn] = useState<{ base: number; delta: number } | null>(null);
  const gesture = useRef<
    | {
        id: number;
        x: number;
        y: number;
        last: number;
        base: number;
        delta: number;
        moved: boolean;
      }
    | undefined
  >(undefined);
  /** ドラッグを離した直後の click（押したマスのコードを鳴らしてしまう）を捨てる期限 */
  const muteClickUntil = useRef(0);
  const canTurn = !!onPick && !mini;
  const steps = turn ? Math.round(turn.delta / 30) : 0;
  const toLocal = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return r.width ? { x: ((e.clientX - r.left) * S) / r.width, y: ((e.clientY - r.top) * S) / r.height } : null;
  };
  // window で受けるのは、指が図の外へ出ても回し続けるため。最新の props を見るよう ref から呼ぶ
  const handlers = useRef({ move: (_: PointerEvent) => {}, end: (_: PointerEvent, _cancel: boolean) => {} });
  handlers.current = {
    move: e => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.id) return;
      const p = toLocal(e);
      if (!p) return;
      const deg = polar(p.x, p.y).deg;
      g.delta += wrap(deg - g.last);
      g.last = deg;
      if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > DRAG_PX) g.moved = true;
      if (g.moved) setTurn({ base: g.base, delta: g.delta });
    },
    end: (e, cancel) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.id) return;
      gesture.current = undefined;
      if (!g.moved) return;
      muteClickUntil.current = performance.now() + 500;
      // 離した角度から、いちばん近いキーへ回して止める（動かした分が半分に満たなければ元のキーへ戻る）
      fan.current = g.base + g.delta;
      setTurn(null);
      const n = Math.round(g.delta / 30);
      if (cancel || n === 0) return;
      onPick!(keyAt(given.key.mode, slotOf(given.key) + n));
      onTurned?.();
    },
  };
  useEffect(() => {
    if (!canTurn) return;
    const move = (e: PointerEvent) => handlers.current.move(e);
    const up = (e: PointerEvent) => handlers.current.end(e, false);
    const cancel = (e: PointerEvent) => handlers.current.end(e, true);
    // 扇の上から始めたときだけ、ページのスクロールを止める（iOS Safari は touch-action を SVG の中で見ないので）
    const touch = (e: TouchEvent) => gesture.current && e.cancelable && e.preventDefault();
    const el = svg.current!;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    el.addEventListener("touchmove", touch, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      el.removeEventListener("touchmove", touch);
    };
  }, [canTurn]);
  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    const p = toLocal(e);
    if (!p || !onFan(p.x, p.y, fan.current)) return;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      last: polar(p.x, p.y).deg,
      base: fan.current,
      delta: 0,
      moved: false,
    };
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    onPick!(keyAt(given.key.mode, slotOf(given.key) + (e.key === "ArrowRight" ? 1 : -1)));
  };

  // 回しているあいだは、行き先のキーで書く（進行の矢印は、行き先で合わないこともあるので消す）
  const s = turn ? { ...given, key: keyAt(given.key.mode, slotOf(given.key) + steps), chord: null } : given;
  const chords = turn ? chordsOf(s) : givenChords;
  const path = turn ? [] : givenPath;
  const playing = turn ? null : givenPlaying;
  const angle = turn ? turn.base + turn.delta : fan.current;
  const cur = playing != null ? path[playing] : undefined;
  const now = cur ? placeOf(cur) : undefined;
  const center = slotOf(s.key);
  // 進行にだけ出てくるコード（アンダルシア進行の Ⅴ など）も輪の上に印を付ける
  const shown = [
    ...chords,
    ...path.filter(c => !chords.some(x => pc(x.root) === pc(c.root) && qualityOf(x) === qualityOf(c))),
  ];
  const places = shown.map(placeOf);
  const at = (ring: Ring, slot: number) => {
    const i = places.findIndex(p => p.ring === ring && p.slot === slot);
    return i < 0 ? undefined : { chord: shown[i]!, place: places[i]! };
  };
  const label =
    `五度圏。キー ${keyLabel(s.key)} のコードは ${chords.map(c => c.symbol).join("・")}` +
    (canTurn ? "。← → でキーを 5 度ずつ回す" : "");
  const marker = mini ? "kv-arrowhead-mini" : "kv-arrowhead";
  return (
    <svg
      ref={svg}
      class={["kv-circle", mini && "mini", canTurn && "turnable", turn && "turning"].filter(Boolean).join(" ")}
      viewBox={`0 0 ${S} ${S}`}
      {...(mini
        ? { "aria-hidden": "true" }
        : {
            role: "group",
            "aria-label": label,
            ...(canTurn && {
              onPointerDown,
              onKeyDown,
              onClickCapture: (e: MouseEvent) => {
                if (performance.now() < muteClickUntil.current) e.stopPropagation();
              },
            }),
          })}
    >
      <g class="kv-fan" style={{ transform: `rotate(${angle}deg)` }} aria-hidden="true">
        <path d={FAN} />
      </g>
      {(["major", "minor", "dim"] as const).map(ring => (
        <circle key={ring} class="kv-ring" cx={C} cy={C} r={RADIUS[ring]} aria-hidden="true" />
      ))}
      {(["major", "minor", "dim"] as const).flatMap(ring =>
        FIFTHS.major.map((_, slot) => {
          const { x, y } = pt(slot, RADIUS[ring]);
          const hit = at(ring, slot);
          // 内の dim の輪は、キーのコード（と進行に出てくるもの）だけを書く。ほかの 11 個は飾りなので出さない
          if (ring === "dim" && !hit) return null;
          // キーのコードは、札と同じ綴りで（F♯m の Ⅴ は D♭ でなく C♯）
          const name = hit
            ? `${fmt(hit.chord.root)}${{ major: "", minor: "m", dim: "dim" }[ring]}`
            : ring === "major"
              ? fmt(note(FIFTHS.major[slot]!))
              : `${fmt(note(FIFTHS.minor[slot]!))}m`;
          const tonic = hit?.chord.degree === 0;
          const borrowed = hit && !inFan(center, hit.place as Place);
          const selected = hit && s.chord === hit.chord.degree && chords.includes(hit.chord);
          const isPlaying = now?.ring === ring && now.slot === slot;
          const cls = [
            "kv-cell",
            `kv-cell--${ring}`,
            hit && "in",
            tonic && "tonic",
            borrowed && "borrowed",
            selected && "selected",
            isPlaying && "playing",
          ]
            .filter(Boolean)
            .join(" ");
          // キーのコードは札と同じく、選んで鳴らす。ほかの外と中の輪はキーを選ぶボタン
          // （内の dim はキーではないので、キーのコードでなければ押せない）
          const chord = hit && chords.includes(hit.chord) ? hit.chord : undefined;
          const key = chord || ring === "dim" || !onPick ? undefined : keyAt(ring, slot);
          const pick = chord && onChord ? () => onChord(chord) : key && (() => onPick!(key));
          return (
            <g
              key={`${ring}${slot}`}
              class={cls}
              {...(pick && {
                role: "button",
                tabindex: 0,
                "aria-label": chord ? `${chord.label}（${chord.symbol}）を鳴らす` : `キー ${keyLabel(key!)} にする`,
                onClick: pick,
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick();
                  }
                },
              })}
            >
              {(hit || pick) && <circle class="kv-dot" cx={x} cy={y} r={CELL[ring]} />}
              {/* 選んでいる印は、札と同じく外側のオレンジの輪 */}
              {selected && <circle class="kv-sel-ring" cx={x} cy={y} r={CELL[ring] + 5} />}
              <text x={x} y={hit ? y - CELL[ring] * 0.28 : y} aria-hidden="true">
                {name}
              </text>
              {hit && (
                <text class="kv-roman" x={x} y={y + CELL[ring] * 0.45} aria-hidden="true">
                  {hit.chord.roman}
                </text>
              )}
            </g>
          );
        }),
      )}
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" class="kv-arrowhead" />
        </marker>
      </defs>
      {path.length > 1 && <ProgArrows path={path} playing={playing} marker={marker} />}
      <text class="kv-center" x={C} y={C - 13} aria-hidden="true">
        {fmt(s.key.tonic)}
      </text>
      <text class="kv-center-sub" x={C} y={C + 9} aria-hidden="true">
        {MODE_TEXT[s.key.mode]}
      </text>
      <text class="kv-center-sub" x={C} y={C + 22} aria-hidden="true">
        調号{sigLabel(keySignature(s.key))}
      </text>
    </svg>
  );
}

/** 進行を鳴らす 1 コードの長さ（playChords の間隔と同じ） */
const PROG_STEP_MS = 900;

/** 指板に出すフレット（開放から 12 フレットまで＝ 1 オクターブ） */
const BOARD_FRETS = 12;

/** 指板：キーのスケール（選んだコードの構成音を重ねる）か、7 つのコードのルートの位置（低い 2 本の弦） */
function KeyBoard({
  s,
  chords,
  onView,
}: {
  s: KeyViewState;
  chords: readonly DiatonicChord[];
  onView: (v: KeyViewState["board"]) => void;
}) {
  const { settings } = useData();
  const t = tuningById(settings.tuning) ?? STANDARD;
  const n = stringCount(t);
  const notes = scaleNotes(scaleOfKey(s.key), s.key.tonic);
  const nameOf = new Map(notes.map(x => [pc(x), fmt(x)]));
  const sel = s.chord != null ? chords[s.chord] : undefined;
  const marks: Mark[] = [];
  for (let string = 1; string <= n; string++)
    for (let fret = 0; fret <= BOARD_FRETS; fret++) {
      const pos = { string, fret };
      const p = pcAt(t, pos);
      if (s.board === "roots") {
        // 低い 2 本の弦の上の、7 つのコードのルート（度数で書く）
        if (string < n - 1) continue;
        const c = chords.find(x => pc(x.root) === p);
        if (!c) continue;
        const kind =
          c.degree === sel?.degree ? "target" : c.degree === 0 ? "root" : qualityOf(c) === "dim" ? "hint" : "tone";
        // 2 本だけの指板に描くので、弦の番号を付け直す（低い弦が 2）
        marks.push({ pos: { string: string - (n - 2), fret }, kind, label: c.roman });
        continue;
      }
      if (!nameOf.has(p)) continue;
      const i = sel ? sel.tones.findIndex(x => pc(x) === p) : -1;
      if (sel && i >= 0) marks.push({ pos, kind: i === 0 ? "root" : "tone", label: sel.toneLabels[i]! });
      else
        marks.push({
          pos,
          kind: !sel && p === pc(s.key.tonic) ? "root" : "tone",
          label: nameOf.get(p)!,
          ...(sel && { dim: true }),
        });
    }
  const standard = t.id === "standard";
  /** 低い 2 本の弦だけのチューニング（ルートの位置の図） */
  const low2: Tuning = { ...t, id: `${t.id}:low2`, open: t.open.slice(0, 2) };
  return (
    <section class="kv-board" aria-labelledby="kv-board-h">
      <h2 id="kv-board-h">指板</h2>
      <div class="chart-bar">
        <div class="toggle-group" role="group" aria-label="指板に出すもの">
          <button aria-pressed={s.board === "scale"} onClick={() => onView("scale")}>
            スケール
          </button>
          <button aria-pressed={s.board === "roots"} onClick={() => onView("roots")}>
            ルートの位置
          </button>
        </div>
      </div>
      <div class="kv-board-fig">
        <HScroll startAtEnd={settings.lefty} resetKey={settings.lefty}>
          <Fretboard
            tuning={s.board === "roots" ? low2 : t}
            {...(s.board === "roots" && { stringNames: [`${n - 1}弦`, `${n}弦`] })}
            range={{ minFret: 0, maxFret: BOARD_FRETS }}
            orientation="horizontal"
            scale={0.8}
            lefty={settings.lefty}
            label={
              s.board === "roots"
                ? `キー ${keyLabel(s.key)} の 7 つのコードのルートの位置`
                : `キー ${keyLabel(s.key)} のスケール${sel ? `と ${sel.symbol} の構成音` : ""}`
            }
            marks={marks}
          />
        </HScroll>
      </div>
      <p class="muted small">
        {s.board === "roots"
          ? `低い 2 本の弦の上の、7 つのコードのルート。${standard ? "ハイコードはこの位置から押さえる。" : ""}${sel ? `輪は ${sel.symbol}。` : ""}`
          : sel
            ? `${sel.symbol} の構成音を度数で。薄いのはほかのスケールの音。`
            : "キーのスケールの音（オレンジが主音）。"}
      </p>
    </section>
  );
}

const PRINT_CHORDS: readonly { id: PrintChords; label: string }[] = [
  { id: "both", label: "両方（上に三和音、下に四和音）" },
  { id: "triad", label: "三和音" },
  { id: "seventh", label: "四和音" },
];

/** 印刷：12 キーのダイアトニックコードの一覧表（A4 横の PDF） */
function KeyPrint({ borrow }: { borrow: boolean }) {
  const [o, setO] = useState<KeyPrintOptions>(() => ({ modes: ["major", "minor"], chords: "both", borrow }));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<KeyPrintOptions>) => setO(x => ({ ...x, ...patch }));
  const toggleMode = (mode: Key["mode"], on: boolean) =>
    set({ modes: (["major", "minor"] as const).filter(m => (m === mode ? on : o.modes.includes(m))) });
  const none = !o.modes.length;
  const make = async (open: boolean) => {
    setBusy(true);
    setMsg("");
    const out = outputPdf(() => buildKeyPrintPages(o), keyPrintFileName(o), open);
    setMsg(await out);
    setBusy(false);
  };
  return (
    <details class="chart-pdf">
      <summary>
        <h2 id="kv-print-h">コードの一覧表を印刷</h2>
      </summary>
      <section class="form" aria-labelledby="kv-print-h">
        <p class="muted small">
          12 キーのダイアトニックコードを、五度圏の順（時計回り）に並べた A4 横の表を作ります。資料の文字は英語です。
        </p>
        <fieldset class="field">
          <legend>キー</legend>
          <label class="check">
            <input
              type="checkbox"
              checked={o.modes.includes("major")}
              onChange={e => toggleMode("major", e.currentTarget.checked)}
            />
            <span>メジャーキー（1 ページ）</span>
          </label>
          <label class="check">
            <input
              type="checkbox"
              checked={o.modes.includes("minor")}
              onChange={e => toggleMode("minor", e.currentTarget.checked)}
            />
            <span>マイナーキー（1 ページ）</span>
          </label>
        </fieldset>
        <fieldset class="field">
          <legend>コード</legend>
          {PRINT_CHORDS.map(c => (
            <label key={c.id} class="check">
              <input
                type="radio"
                name="kv-print-chords"
                checked={o.chords === c.id}
                onChange={() => set({ chords: c.id })}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>
        <label class="check">
          <input
            type="checkbox"
            checked={o.borrow}
            disabled={!o.modes.includes("minor")}
            onChange={e => set({ borrow: e.currentTarget.checked })}
          />
          <span>マイナーの Ⅴ・Ⅶ をハーモニックマイナーから借りる</span>
        </label>
        {none && <p class="ng">メジャーかマイナーを選んでください。</p>}
        <div class="actions">
          <button class="btn" disabled={none} aria-expanded={preview} onClick={() => setPreview(v => !v)}>
            {preview ? "プレビューを閉じる" : `プレビュー（${keyPrintPageCount(o)} ページ）`}
          </button>
          <button class="btn primary" disabled={none || busy} onClick={() => void make(false)}>
            {busy ? "作成中…" : "PDF をダウンロード"}
          </button>
          <button class="btn" disabled={none || busy} onClick={() => void make(true)}>
            開いて印刷
          </button>
        </div>
        <p class="muted small" role="status">
          {msg}
        </p>
        {preview && !none && <PdfPreview pages={buildKeyPrintPages(o)} />}
      </section>
    </details>
  );
}

export function KeyView({ query }: { query: string }) {
  const { settings } = useData();
  const [s, setS] = useState<KeyViewState>(() => fromParams(new URLSearchParams(query), DEFAULT_KEY_VIEW));
  /** 1 つ前のキー（変わった音を出すため。URL には持たない） */
  const [prev, setPrev] = useState<Key | null>(null);
  /** 扇形を回したことがあるか（無ければ回し方を案内する） */
  const [turned, setTurned] = useState(readTurned);

  useEffect(() => {
    history.replaceState(null, "", href({ name: "key", query: toParams(s).toString() }));
  }, [s]);

  const set = (patch: Partial<KeyViewState>) => setS(x => ({ ...x, ...patch }));
  const goKey = (k: Key) => {
    if (keyId(k) === keyId(s.key)) return;
    setPrev(s.key);
    // 進行はメジャーとマイナーで別。合わなくなったら外す（自分で作った進行は度数なので残す）
    const fits = s.prog === "custom" || progressionsFor(k).some(x => x.id === s.prog);
    set({ key: k, chord: null, ...(!fits && { prog: null }) });
  };

  // 進行を鳴らしているあいだ、今のコードを目立たせる（playChords と同じ間隔）
  const [playing, setPlaying] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stopTimers, []);
  const playProg = (cs: readonly DiatonicChord[]) => {
    stopTimers();
    playChords(cs.map(chordMidis));
    cs.forEach((_, i) => timers.current.push(window.setTimeout(() => setPlaying(i), i * PROG_STEP_MS)));
    timers.current.push(window.setTimeout(() => setPlaying(null), cs.length * PROG_STEP_MS + 700));
  };
  /** コードを選んで鳴らす（札と、五度圏の扇形の中で同じ）。自分で進行を作っているときは、進行の後ろに足す */
  const pickChord = (c: DiatonicChord) => {
    const add = s.prog === "custom" && s.custom.length < MAX_CUSTOM;
    set({ chord: c.degree, ...(add && { custom: [...s.custom, c.degree] }) });
    playMidi(chordMidis(c), { strum: true });
  };
  const step = (d: number) => goKey(keyAt(s.key.mode, slotOf(s.key) + d));

  const chords = chordsOf(s);
  const prog = progChords(s);
  const notes = scaleNotes(scaleOfKey(s.key), s.key.tonic);
  const change = prev ? changedNotes(prev, s.key) : undefined;
  const newPcs = new Set(change?.to.map(pc));
  const sel = s.chord != null ? chords[s.chord] : undefined;
  const flat = keySignature(s.key) < 0;
  const chartLink = (patch: object) =>
    href({
      name: "chart",
      query: chartParams({
        ...DEFAULT_CHART,
        tuning: settings.tuning,
        lefty: settings.lefty,
        flat,
        ...patch,
      }).toString(),
    });
  const rel = relative(s.key),
    par = parallel(s.key);

  // 並び：スマホは「キー → 五度圏 → 札 → 選んだコードと指板 → 進行 → スケールと関係調」の 1 列で、
  // 札を押すと真上の五度圏と真下の指板に結果が出る。広い画面では五度圏を左に止めて、右に札から下を並べる
  return (
    <>
      <header class="bar">
        <h1 tabIndex={-1}>キー</h1>
      </header>

      <div class="kv-layout">
        <section class="kv-side" aria-label="五度圏">
          <div class="kv-pick">
            <button class="btn" onClick={() => step(-1)} aria-label="5 度下のキーへ（反時計回り）">
              ◀ 5度下
            </button>
            <label class="field">
              <span class="sr-only">キー</span>
              <select
                value={keyId(s.key)}
                onChange={e => goKey(ALL_KEYS.find(k => keyId(k) === e.currentTarget.value)!)}
              >
                {(["major", "minor"] as const).map(mode => (
                  <optgroup key={mode} label={mode === "major" ? "メジャー" : "マイナー"}>
                    {KEYS[mode].map(k => (
                      <option key={keyId(k)} value={keyId(k)}>
                        {keyOptionText(k)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button class="btn" onClick={() => step(1)} aria-label="5 度上のキーへ（時計回り）">
              5度上 ▶
            </button>
          </div>
          <KeyCircle
            s={s}
            chords={chords}
            path={prog}
            playing={playing}
            onPick={goKey}
            onChord={pickChord}
            onTurned={() => {
              setTurned(true);
              saveTurned();
            }}
          />
          {!turned && <p class="small muted kv-hint">扇形をつかんで回すとキーが変わる</p>}
          {change && prev && (
            <p class="small kv-change" role="status">
              {keyLabel(prev)} → {keyLabel(s.key)}：
              {change.to.length === 0
                ? "スケールの音は同じ（調号が同じ）"
                : `${change.from.map(fmt).join("・")} が ${change.to.map(fmt).join("・")} に変わる`}
            </p>
          )}
        </section>

        <div class="kv-main">
          <section class="kv-chords" aria-labelledby="kv-chords-h">
            <h2 id="kv-chords-h">ダイアトニックコード</h2>
            <div class="kv-cards">
              {chords.map(c => {
                const q = qualityOf(c);
                const borrowed = !inFan(slotOf(s.key), placeOf(c));
                return (
                  <button
                    key={c.degree}
                    class={`kv-card kv-card--${QUALITY_CLASS[q]}${c.degree === 0 ? " tonic" : ""}${borrowed ? " borrowed" : ""}`}
                    aria-pressed={s.chord === c.degree}
                    aria-label={`${c.label}（${c.symbol}）を鳴らす`}
                    onClick={() => pickChord(c)}
                  >
                    <span class="kv-card-name">{breakable(c.symbol)}</span>
                    <span class="kv-card-roman">{c.roman}</span>
                    {s.func && (
                      <span class={`kv-func kv-func--${funcOf(s.key, c.degree, s.borrow)}`}>
                        {funcOf(s.key, c.degree, s.borrow)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div class="chart-bar">
              <div class="toggle-group" role="group" aria-label="和音の数">
                <button aria-pressed={s.size === 3} onClick={() => set({ size: 3 })}>
                  三和音
                </button>
                <button aria-pressed={s.size === 4} onClick={() => set({ size: 4 })}>
                  四和音
                </button>
              </div>
              <div class="toggle-group">
                <button aria-pressed={s.func} onClick={() => set({ func: !s.func })}>
                  機能
                </button>
              </div>
              <button class="btn" onClick={() => playChords(chords.map(chordMidis))}>
                ▶ Ⅰ から順に鳴らす
              </button>
            </div>
            {s.key.mode === "minor" && (
              <label class="check">
                <input type="checkbox" checked={s.borrow} onChange={e => set({ borrow: e.currentTarget.checked })} />
                <span>Ⅴ・Ⅶ をハーモニックマイナーから借りる</span>
              </label>
            )}
            <ul class="kv-key" aria-label="色と形の見方">
              <li>
                <span class="kv-sw kv-card--maj" aria-hidden="true" />
                メジャー
              </li>
              <li>
                <span class="kv-sw kv-card--min" aria-hidden="true" />
                マイナー
              </li>
              <li>
                <span class="kv-sw kv-card--dim" aria-hidden="true" />
                dim
              </li>
              <li>
                <span class="kv-sw tonic" aria-hidden="true" />
                主音（Ⅰ）
              </li>
              <li>
                <span class="kv-sw selected" aria-hidden="true" />
                選んでいるコード
              </li>
              {s.borrow && s.key.mode === "minor" && (
                <li>
                  <span class="kv-sw borrowed" aria-hidden="true" />
                  借りたコード（扇形の外）
                </li>
              )}
            </ul>
            <p class="muted small">
              扇形の中と札はコードが鳴ります。キーは、扇形をつかんで回すか、扇形の外の文字を押すと変わります。
            </p>
          </section>

          {/* 選んだコードと指板は 1 つのまとまり（選んでいなければ、指板にキーのスケールを出す） */}
          <div class={`kv-focus${sel ? " on" : ""}`}>
            {sel && (
              <div class="kv-detail" role="region" aria-label={`${sel.symbol} の構成音`}>
                <p class="kv-detail-name">
                  <strong>{sel.label}</strong>＝<strong>{sel.symbol}</strong>
                  <button
                    class="kv-replay"
                    onClick={() => playMidi(chordMidis(sel), { strum: true })}
                    aria-label={`${sel.symbol} をもう一度鳴らす`}
                  >
                    ▶
                  </button>
                </p>
                <p class="kv-tones">
                  {sel.tones.map((n, i) => (
                    <span key={i} class={`kv-tone${i === 0 ? " root" : ""}`}>
                      <span>{fmt(n)}</span>
                      <small>{sel.toneLabels[i]}</small>
                    </span>
                  ))}
                </p>
                <p class="small">{FUNC_TEXT[funcOf(s.key, sel.degree, s.borrow)]}</p>
                {arpeggioIdOf(sel.type.id) && (
                  <a
                    class="chart-drill"
                    href={chartLink({
                      chartType: "arpeggio",
                      arpeggio: arpeggioIdOf(sel.type.id)!,
                      root: pc(sel.root),
                    })}
                  >
                    {sel.symbol} のアルペジオをチャートで開く<span aria-hidden="true"> ›</span>
                  </a>
                )}
              </div>
            )}
            <KeyBoard s={s} chords={chords} onView={board => set({ board })} />
          </div>

          <section class="kv-prog" aria-labelledby="kv-prog-h">
            <h2 id="kv-prog-h">進行</h2>
            <label class="field">
              <span class="sr-only">進行</span>
              <select
                value={s.prog ?? ""}
                onChange={e => {
                  stopTimers();
                  setPlaying(null);
                  set({ prog: e.currentTarget.value || null });
                }}
              >
                <option value="">（出さない）</option>
                {progressionsFor(s.key).map(x => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
                <option value="custom">自分で作る（札を押して足す）</option>
              </select>
            </label>
            {s.prog && (
              <>
                {prog.length > 0 ? (
                  <ol class="kv-steps" aria-label="進行のコード">
                    {prog.map((c, i) => (
                      <li key={i} class={playing === i ? "playing" : undefined}>
                        {i > 0 && (
                          <span class={`kv-motion${rootMotion(prog[i - 1]!, c).strong ? " strong" : ""}`}>
                            {rootMotion(prog[i - 1]!, c).label}
                          </span>
                        )}
                        <span
                          class={`kv-step kv-card--${QUALITY_CLASS[qualityOf(c)]}${c.degree === 0 ? " tonic" : ""}`}
                        >
                          <span class="kv-card-name">{c.symbol}</span>
                          <span class="kv-card-roman">{c.roman}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p class="muted small">上の札を押すと、押した順に進行に足していきます（{MAX_CUSTOM} つまで）。</p>
                )}
                <div class="actions">
                  <button class="btn primary" disabled={!prog.length} onClick={() => playProg(prog)}>
                    ▶ 進行を鳴らす
                  </button>
                  {s.prog === "custom" && (
                    <>
                      <button
                        class="btn"
                        disabled={!s.custom.length}
                        onClick={() => set({ custom: s.custom.slice(0, -1) })}
                      >
                        1 つ戻す
                      </button>
                      <button class="btn" disabled={!s.custom.length} onClick={() => set({ custom: [] })}>
                        消す
                      </button>
                    </>
                  )}
                </div>
                {prog.length > 1 && (
                  <>
                    {/* スマホでは上の五度圏が画面の外なので、矢印の動きを進行のそばの写しで見せる */}
                    <KeyCircle s={s} chords={chords} path={prog} playing={playing} mini />
                    <p class="muted small">矢印がコードの動き。「5度下」（反時計回りに 1 つ）がいちばん強い。</p>
                  </>
                )}
              </>
            )}
          </section>

          <section class="kv-scale" aria-labelledby="kv-scale-h">
            <div class="kv-scale-h">
              <h2 id="kv-scale-h">
                {fmt(s.key.tonic)} {MODE_TEXT[s.key.mode]}・{sigText(s.key)}
              </h2>
              <button
                class="kv-replay"
                onClick={() =>
                  playMidi(
                    scaleMidis(
                      pc(s.key.tonic),
                      notes.map(n => mod(pc(n) - pc(s.key.tonic), 12)),
                    ),
                  )
                }
                aria-label={`${keyLabel(s.key)} のスケールを鳴らす`}
              >
                ▶
              </button>
            </div>
            <p class="chart-tones">
              {notes.map((n, i) => (
                <span key={i} class={`tone-dot${i === 0 ? " root" : ""}${newPcs.has(pc(n)) ? " changed" : ""}`}>
                  {fmt(n)}
                </span>
              ))}
            </p>
            <div class="kv-related" role="group" aria-label="関係のあるキーへ移る">
              <button
                class="kv-chip"
                onClick={() => goKey(rel)}
                aria-label={`平行調 ${keyLabel(rel)} にする（調号が同じ）`}
              >
                平行調 {keyLabel(rel)}
              </button>
              <button
                class="kv-chip"
                onClick={() => goKey(par)}
                aria-label={`同主調 ${keyLabel(par)} にする（主音が同じ）`}
              >
                同主調 {keyLabel(par)}
              </button>
              <span class="muted small">平行調は調号が、同主調は主音が同じ</span>
            </div>
          </section>

          <nav class="kv-links" aria-label="このキーで続ける">
            <a
              class="chart-drill"
              href={href({
                name: "drill",
                topicId: "diatonic",
                only: JSON.stringify({ size: s.size, borrowDominant: s.borrow, keys: [keyId(s.key)] }),
              })}
            >
              キー {keyLabel(s.key)} のコードをドリルで確かめる<span aria-hidden="true"> ›</span>
            </a>
            <a
              class="chart-drill"
              href={chartLink({ chartType: "scale", scale: scaleOfKey(s.key), root: pc(s.key.tonic) })}
            >
              {keyLabel(s.key)} のスケールをチャートで開く<span aria-hidden="true"> ›</span>
            </a>
          </nav>

          <KeyPrint borrow={s.borrow} />
        </div>
      </div>
    </>
  );
}
