/* localStorage への保存。キーは 1 つ。localStorage が使えない環境（プライベートモードなど）でも落ちず、
   そのときはメモリにだけ持つ。 */
import { type SaveData, VERSION, emptyData, parseData } from "./schema";

export const STORAGE_KEY = "guitar-drill";

/** 保存先。localStorage と同じ getItem / setItem だけ使う */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function memoryStorage(): KeyValue {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** 使える localStorage。使えなければ null */
export function browserStorage(): KeyValue | null {
  try {
    const s = globalThis.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class Store {
  #data: SaveData;
  readonly #kv: KeyValue;
  readonly #listeners = new Set<() => void>();
  /** 保存できているか（false ならメモリだけ。画面で知らせる） */
  persistent: boolean;

  constructor(kv: KeyValue | null = browserStorage()) {
    this.#kv = kv ?? memoryStorage();
    this.persistent = kv !== null;
    this.#data = this.#read();
  }

  #read(): SaveData {
    try {
      const text = this.#kv.getItem(STORAGE_KEY);
      return text ? parseData(JSON.parse(text)) : emptyData();
    } catch {
      return emptyData();
    }
  }

  get data(): SaveData {
    return this.#data;
  }

  /** 書き換えて保存する。保存に失敗しても（容量超過など）メモリ上の値は更新する */
  update(f: (d: SaveData) => SaveData): SaveData {
    this.#data = f(this.#data);
    try {
      this.#kv.setItem(STORAGE_KEY, JSON.stringify(this.#data));
    } catch {
      this.persistent = false;
    }
    for (const l of this.#listeners) l();
    return this.#data;
  }

  /** 変更の通知を受ける。戻り値で解除する */
  subscribe(l: () => void): () => void {
    this.#listeners.add(l);
    return () => void this.#listeners.delete(l);
  }
}

/** 書き出し（Safari ↔ ホーム画面版の移行用） */
export const exportJson = (d: SaveData, now = new Date()): string =>
  JSON.stringify({ app: "guitar-drill", exportedAt: now.toISOString(), ...d }, null, 2);

export type ImportResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** 読み込み。今の記録と置き換える前に、画面で確認を取る */
export function importJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON として読めません" };
  }
  if (typeof raw !== "object" || raw === null || (raw as { app?: unknown }).app !== "guitar-drill")
    return { ok: false, error: "guitar-drill の書き出しファイルではありません" };
  const v = (raw as { version?: unknown }).version;
  if (typeof v === "number" && v > VERSION)
    return { ok: false, error: "新しい版のアプリで書き出したファイルです。アプリを更新してください" };
  return { ok: true, data: parseData(raw) };
}
