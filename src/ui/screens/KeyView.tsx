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
  dimLabel,
  fromParams,
  funcOf,
  inFan,
  keyAt,
  placeOf,
  qualityOf,
  scaleOfKey,
  slotOf,
  toParams,
} from "../../keyview/state";
import type { Mark } from "../../drill/topic";
import { Fretboard } from "../Fretboard";
import { HScroll } from "../HScroll";
import { href } from "../route";

const ALL_KEYS: readonly Key[] = [...KEYS.major, ...KEYS.minor];

/** 同主調（主音が同じで、メジャーとマイナーが逆）。異名同音は一覧にある綴りで（C♯ でなく D♭） */
const parallel = (k: Key): Key =>
  ALL_KEYS.find(x => x.mode !== k.mode && pc(x.tonic) === pc(k.tonic)) ?? {
    ...k,
    mode: k.mode === "major" ? "minor" : "major",
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

/** 札の幅に収まらないときは「(」の前で折る（Bm7 / (♭5)） */
const breakable = (symbol: string) => symbol.replace("(", "\u200b(");

const chordMidis = (c: DiatonicChord) => voiced(pc(c.root), c.tones.map(pc));

/* 五度圏の寸法（viewBox 360 × 360） */
const S = 360,
  C = S / 2;
const RADIUS: Readonly<Record<Ring, number>> = { major: 146, minor: 100, dim: 62 };
const CELL: Readonly<Record<Ring, number>> = { major: 22, minor: 18, dim: 16 };
/** 位置 i（C = 0 が真上、時計回り）の点 */
const pt = (i: number, r: number) => {
  const a = (i * Math.PI) / 6;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
/** 真上（位置 0）を真ん中にした扇形。外と中の輪は 3 つ分、内の輪は 1 つ分 */
const FAN = (() => {
  const p = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
  };
  const [o, m, i] = [174, 81, 42];
  return [
    `M ${p(-45, o)}`,
    `A ${o} ${o} 0 0 1 ${p(45, o)}`,
    `L ${p(45, m)}`,
    `A ${m} ${m} 0 0 0 ${p(15, m)}`,
    `L ${p(15, i)}`,
    `A ${i} ${i} 0 0 0 ${p(-15, i)}`,
    `L ${p(-15, m)}`,
    `A ${m} ${m} 0 0 0 ${p(-45, m)}`,
    "Z",
  ].join(" ");
})();

/** 扇形の回転（度）。前の向きから近いほうへ回るよう、角度を積み上げる */
function useFanAngle(slot: number): number {
  const ref = useRef(slot * 30);
  const prev = ref.current;
  const d = mod(slot * 30 - prev + 180, 360) - 180;
  ref.current = prev + d;
  return ref.current;
}

function KeyCircle({
  s,
  chords,
  onPick,
}: {
  s: KeyViewState;
  chords: readonly DiatonicChord[];
  onPick: (k: Key) => void;
}) {
  const center = slotOf(s.key);
  const angle = useFanAngle(center);
  const places = chords.map(placeOf);
  const at = (ring: Ring, slot: number) => {
    const i = places.findIndex(p => p.ring === ring && p.slot === slot);
    return i < 0 ? undefined : { chord: chords[i]!, place: places[i]! };
  };
  const label = `五度圏。キー ${keyLabel(s.key)} のコードは ${chords.map(c => c.symbol).join("・")}`;
  return (
    <svg class="kv-circle" viewBox={`0 0 ${S} ${S}`} role="group" aria-label={label}>
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
          const name =
            ring === "major"
              ? fmt(note(FIFTHS.major[slot]!))
              : ring === "minor"
                ? `${fmt(note(FIFTHS.minor[slot]!))}m`
                : dimLabel(slot);
          const tonic = hit?.chord.degree === 0;
          const borrowed = hit && !inFan(center, hit.place as Place);
          const selected = hit && s.chord === hit.chord.degree;
          const cls = [
            "kv-cell",
            `kv-cell--${ring}`,
            hit && "in",
            tonic && "tonic",
            borrowed && "borrowed",
            selected && "selected",
          ]
            .filter(Boolean)
            .join(" ");
          // 外と中の輪はキーを選ぶボタン（内の dim はキーではないので押せない）
          const key = ring === "dim" ? undefined : keyAt(ring, slot);
          const pick = key && (() => onPick(key));
          return (
            <g
              key={`${ring}${slot}`}
              class={cls}
              {...(pick && {
                role: "button",
                tabIndex: 0,
                "aria-label": `キー ${keyLabel(key!)} にする`,
                onClick: pick,
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick();
                  }
                },
              })}
            >
              {(hit || pick) && <circle cx={x} cy={y} r={CELL[ring]} />}
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
      <text class="kv-center" x={C} y={C - 8} aria-hidden="true">
        {keyLabel(s.key)}
      </text>
      <text class="kv-center-sub" x={C} y={C + 14} aria-hidden="true">
        {sigLabel(keySignature(s.key))}
      </text>
    </svg>
  );
}

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
          ? `低い 2 本の弦の上の、7 つのコードのルート。${
              standard ? "6 弦ルートと 5 弦ルートのハイコードを、この位置から押さえる。" : ""
            }${sel ? `輪は ${sel.symbol}。` : "札を選ぶと、そのコードに輪が付く。"}`
          : sel
            ? `${sel.symbol} の構成音を度数で、ほかのスケールの音を薄く出しています。`
            : "キーのスケールの音（オレンジが主音）。札を選ぶと、そのコードの構成音を重ねます。"}
      </p>
    </section>
  );
}

export function KeyView({ query }: { query: string }) {
  const { settings } = useData();
  const [s, setS] = useState<KeyViewState>(() => fromParams(new URLSearchParams(query), DEFAULT_KEY_VIEW));
  /** 1 つ前のキー（変わった音を出すため。URL には持たない） */
  const [prev, setPrev] = useState<Key | null>(null);

  useEffect(() => {
    history.replaceState(null, "", href({ name: "key", query: toParams(s).toString() }));
  }, [s]);

  const set = (patch: Partial<KeyViewState>) => setS(x => ({ ...x, ...patch }));
  const goKey = (k: Key) => {
    if (keyId(k) === keyId(s.key)) return;
    setPrev(s.key);
    set({ key: k, chord: null });
  };
  const step = (d: number) => goKey(keyAt(s.key.mode, slotOf(s.key) + d));

  const chords = chordsOf(s);
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

  return (
    <>
      <header class="bar">
        <h1 tabIndex={-1}>キー</h1>
        <button
          class="bar-link link-btn"
          onClick={() =>
            playMidi(
              scaleMidis(
                pc(s.key.tonic),
                notes.map(n => mod(pc(n) - pc(s.key.tonic), 12)),
              ),
            )
          }
          aria-label={`${keyLabel(s.key)} のスケールを試聴`}
        >
          ▶ スケール
        </button>
      </header>

      <section aria-label="五度圏">
        <div class="kv-pick">
          <button class="btn" onClick={() => step(-1)} aria-label="5 度下のキーへ（反時計回り）">
            ◀ 5度下
          </button>
          <label class="field">
            <span class="sr-only">キー</span>
            <select value={keyId(s.key)} onChange={e => goKey(ALL_KEYS.find(k => keyId(k) === e.currentTarget.value)!)}>
              {(["major", "minor"] as const).map(mode => (
                <optgroup key={mode} label={mode === "major" ? "メジャー" : "マイナー"}>
                  {KEYS[mode].map(k => (
                    <option key={keyId(k)} value={keyId(k)}>
                      {keyLabel(k)}（{sigLabel(keySignature(k))}）
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
        <KeyCircle s={s} chords={chords} onPick={goKey} />
        <p class="muted small kv-legend">
          扇形の 7 つがキー {keyLabel(s.key)}{" "}
          のコード（外：メジャー・中：マイナー・内：dim）。輪の文字を押すとキーが変わります。
        </p>
      </section>

      <section class="kv-scale" aria-labelledby="kv-scale-h">
        <h2 id="kv-scale-h">
          {keyLabel(s.key)} {s.key.mode === "major" ? "メジャー" : "マイナー"}・{sigText(s.key)}
        </h2>
        <p class="chart-tones">
          {notes.map((n, i) => (
            <span key={i} class={`tone-dot${i === 0 ? " root" : ""}${newPcs.has(pc(n)) ? " changed" : ""}`}>
              {fmt(n)}
            </span>
          ))}
        </p>
        {change && prev && (
          <p class="small kv-change" role="status">
            {keyLabel(prev)} → {keyLabel(s.key)}：
            {change.to.length === 0
              ? "スケールの音は同じ（調号が同じ）"
              : change.to.length === 1
                ? `${fmt(change.from[0]!)} が ${fmt(change.to[0]!)} に変わる（輪で囲んだ音）`
                : `${change.to.length} つの音が変わる（輪で囲んだ音）`}
          </p>
        )}
        <p class="kv-related">
          <span>
            <button class="link-btn" onClick={() => goKey(rel)}>
              平行調 {keyLabel(rel)}
            </button>
            <span class="muted small">（調号が同じ）</span>
          </span>
          <span>
            <button class="link-btn" onClick={() => goKey(par)}>
              同主調 {keyLabel(par)}
            </button>
            <span class="muted small">（主音が同じ）</span>
          </span>
        </p>
      </section>

      <section class="kv-chords" aria-labelledby="kv-chords-h">
        <h2 id="kv-chords-h">ダイアトニックコード</h2>
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
        </div>
        {s.key.mode === "minor" && (
          <label class="check">
            <input type="checkbox" checked={s.borrow} onChange={e => set({ borrow: e.currentTarget.checked })} />
            <span>Ⅴ・Ⅶ をハーモニックマイナーから借りる</span>
          </label>
        )}
        <div class="kv-cards">
          {chords.map(c => {
            const q = qualityOf(c);
            const borrowed = !inFan(slotOf(s.key), placeOf(c));
            return (
              <button
                key={c.degree}
                class={`kv-card kv-card--${QUALITY_CLASS[q]}${borrowed ? " borrowed" : ""}`}
                aria-pressed={s.chord === c.degree}
                aria-label={`${c.label}（${c.symbol}）を鳴らす`}
                onClick={() => {
                  set({ chord: c.degree });
                  playMidi(chordMidis(c), { strum: true });
                }}
              >
                <span class="kv-card-roman">{c.roman}</span>
                <span class="kv-card-name">{breakable(c.symbol)}</span>
                {s.func && <span class={`kv-func kv-func--${funcOf(s.key, c.degree)}`}>{funcOf(s.key, c.degree)}</span>}
              </button>
            );
          })}
        </div>
        <p class="muted small">
          札を押すとコードが鳴ります。オレンジがメジャー、灰色がマイナー、赤が dim
          {s.borrow && s.key.mode === "minor" ? "、点線は借りたコード（扇形の外）" : ""}。
        </p>
        <div class="actions">
          <button class="btn" onClick={() => playChords(chords.map(chordMidis))}>
            ▶ Ⅰ から順に鳴らす
          </button>
        </div>

        {sel && (
          <div class="kv-detail" role="region" aria-label={`${sel.symbol} の構成音`}>
            <p class="kv-detail-name">
              <strong>{sel.label}</strong>＝<strong>{sel.symbol}</strong>
            </p>
            <p class="kv-tones">
              {sel.tones.map((n, i) => (
                <span key={i} class={`kv-tone${i === 0 ? " root" : ""}`}>
                  <span>{fmt(n)}</span>
                  <small>{sel.toneLabels[i]}</small>
                </span>
              ))}
            </p>
            <p class="small">{FUNC_TEXT[funcOf(s.key, sel.degree)]}</p>
            <div class="actions">
              <button class="btn" onClick={() => playMidi(chordMidis(sel), { strum: true })}>
                ▶ もう一度
              </button>
            </div>
            {arpeggioIdOf(sel.type.id) && (
              <a
                class="chart-drill"
                href={chartLink({ chartType: "arpeggio", arpeggio: arpeggioIdOf(sel.type.id)!, root: pc(sel.root) })}
              >
                {sel.symbol} のアルペジオをチャートで開く<span aria-hidden="true"> ›</span>
              </a>
            )}
          </div>
        )}
      </section>

      <KeyBoard s={s} chords={chords} onView={board => set({ board })} />

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
    </>
  );
}
