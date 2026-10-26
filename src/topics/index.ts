/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";
import { circleOfFifths } from "./circle-of-fifths";
import { diatonic } from "./diatonic";
import { fretNotes } from "./fret-notes";
import { intervals } from "./intervals";
import { openStrings } from "./open-strings";
import { progressions } from "./progressions";
import { sevenths } from "./sevenths";
import { triads } from "./triads";

export const TOPICS: readonly AnyTopic[] = [
  openStrings,
  fretNotes,
  triads,
  intervals,
  diatonic,
  sevenths,
  circleOfFifths,
  progressions,
];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
