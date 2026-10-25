/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";
import { diatonic } from "./diatonic";
import { fretNotes } from "./fret-notes";
import { intervals } from "./intervals";
import { openStrings } from "./open-strings";
import { triads } from "./triads";

export const TOPICS: readonly AnyTopic[] = [openStrings, fretNotes, triads, intervals, diatonic];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
