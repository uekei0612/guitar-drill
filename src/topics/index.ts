/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";
import { fretNotes } from "./fret-notes";
import { openStrings } from "./open-strings";
import { triads } from "./triads";

export const TOPICS: readonly AnyTopic[] = [openStrings, fretNotes, triads];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
