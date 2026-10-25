/* 分野の一覧。新しい分野はここに足す */
import type { AnyTopic } from "../drill/topic";

export const TOPICS: readonly AnyTopic[] = [];

export const topicById = (id: string): AnyTopic | undefined => TOPICS.find(t => t.id === id);
