/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";
import { circleOfFifths } from "./circle-of-fifths";
import { diatonic } from "./diatonic";
import { dominantScales } from "./dominant-scales";
import { fretNotes } from "./fret-notes";
import { intervals } from "./intervals";
import { modes } from "./modes";
import { openStrings } from "./open-strings";
import { progressions } from "./progressions";
import { scaleBoxes } from "./scale-boxes";
import { secondaryDominants } from "./secondary-dominants";
import { sevenths } from "./sevenths";
import { tensions } from "./tensions";
import { triads } from "./triads";
import { voicings } from "./voicings";

export const TOPICS: readonly AnyTopic[] = [
  openStrings,
  fretNotes,
  triads,
  intervals,
  scaleBoxes,
  diatonic,
  sevenths,
  circleOfFifths,
  progressions,
  modes,
  tensions,
  dominantScales,
  secondaryDominants,
  voicings,
];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
