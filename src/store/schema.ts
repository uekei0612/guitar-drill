/* 記録の形と検証。保存値は信用せず、版を見て移行し、値を 1 つずつ検証する（壊れた値は既定値）。 */
import { MAX_EASE, MAX_INTERVAL, MIN_EASE, type ItemStat } from "../drill/schedule";
import { TUNINGS } from "../theory";

export const VERSION = 1;

export type Theme = "system" | "light" | "dark";

export interface Settings {
  /** チューニングの ID（TUNINGS） */
  readonly tuning: string;
  readonly lefty: boolean;
  readonly theme: Theme;
  /** 1 セッションの問題数 */
  readonly sessionSize: number;
  /** 選択肢の問題で正解したら、少し待って自動で次へ進む */
  readonly autoNext: boolean;
  /** 分野ごとの設定。中身は分野の settings.parse で検証してから使う */
  readonly topics: Readonly<Record<string, unknown>>;
}

export interface SaveData {
  readonly version: number;
  readonly settings: Settings;
  /** キーは `<topicId>/<itemId>` */
  readonly items: Readonly<Record<string, ItemStat>>;
}

export const SESSION_SIZES = [10, 20, 30] as const;

export const DEFAULT_SETTINGS: Settings = {
  tuning: "standard",
  lefty: false,
  theme: "system",
  sessionSize: 20,
  autoNext: true,
  topics: {},
};

export const emptyData = (): SaveData => ({ version: VERSION, settings: DEFAULT_SETTINGS, items: {} });

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const int = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

export function parseSettings(raw: unknown): Settings {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  return {
    tuning: TUNINGS.some(t => t.id === r.tuning) ? (r.tuning as string) : d.tuning,
    lefty: typeof r.lefty === "boolean" ? r.lefty : d.lefty,
    theme: r.theme === "light" || r.theme === "dark" || r.theme === "system" ? r.theme : d.theme,
    sessionSize: (SESSION_SIZES as readonly unknown[]).includes(r.sessionSize)
      ? (r.sessionSize as number)
      : d.sessionSize,
    autoNext: typeof r.autoNext === "boolean" ? r.autoNext : d.autoNext,
    topics: isObj(r.topics) ? Object.fromEntries(Object.entries(r.topics).filter(([, v]) => isObj(v))) : d.topics,
  };
}

/** 1 件の成績。読めなければ undefined（その item は未出題に戻る） */
export function parseStat(raw: unknown): ItemStat | undefined {
  if (!isObj(raw)) return undefined;
  const { ease, interval, due, tries, correct } = raw;
  if (!num(ease) || ease < MIN_EASE || ease > MAX_EASE) return undefined;
  if (!num(interval) || interval < 0 || interval > MAX_INTERVAL) return undefined;
  if (!num(due) || due < 0) return undefined;
  if (!int(tries) || !int(correct) || correct > tries) return undefined;
  return { ease, interval, due, tries, correct };
}

const ITEM_KEY = /^[\w-]+\/[^\s/][^\s]*$/;

export function parseItems(raw: unknown): Record<string, ItemStat> {
  if (!isObj(raw)) return {};
  const out: Record<string, ItemStat> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = parseStat(v);
    if (s && ITEM_KEY.test(k)) out[k] = s;
  }
  return out;
}

/** 版ごとの移行。n → n+1 の関数を並べる（版 1 が最初なので、今はまだ無い） */
const MIGRATIONS: Record<number, (raw: Obj) => Obj> = {};

/** 保存値を今の版に移行して検証する */
export function parseData(raw: unknown): SaveData {
  if (!isObj(raw)) return emptyData();
  let r = raw;
  let v = int(r.version) && r.version >= 1 ? r.version : VERSION;
  while (v < VERSION) {
    const m = MIGRATIONS[v];
    if (m) r = m(r);
    v++;
  }
  return { version: VERSION, settings: parseSettings(r.settings), items: parseItems(r.items) };
}
