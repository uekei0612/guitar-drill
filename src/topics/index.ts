/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";
import { openStrings } from "./open-strings";

export const TOPICS: readonly AnyTopic[] = [openStrings];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
