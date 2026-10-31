import { useEffect } from "preact/hooks";
import { APP_ENV, APP_VERSION } from "./env";
import { store, useData } from "./state";
import { topicById } from "./topics";
import { REVIEW_ID, reviewTopic } from "./topics/review";
import { useRoute } from "./ui/route";
import { Chart } from "./ui/screens/Chart";
import { Drill } from "./ui/screens/Drill";
import { Home } from "./ui/screens/Home";
import { KeyView } from "./ui/screens/KeyView";
import { Reference } from "./ui/screens/Reference";
import { Settings } from "./ui/screens/Settings";
import { TabBar, tabOf } from "./ui/TabBar";
import { UpdatePrompt } from "./ui/UpdatePrompt";

export function App() {
  const route = useRoute();
  const { settings } = useData();

  useEffect(() => {
    const el = document.documentElement;
    if (settings.theme === "system") delete el.dataset.theme;
    else el.dataset.theme = settings.theme;
  }, [settings.theme]);

  // 画面が変わったら見出しへ（読み上げとキーボード操作のため）
  useEffect(() => {
    document.querySelector<HTMLElement>("main h1")?.focus();
    scrollTo(0, 0);
  }, [route]);

  const topic =
    route.name === "drill" && route.topicId === REVIEW_ID
      ? reviewTopic(store)
      : route.name === "drill" || route.name === "reference"
        ? topicById(route.topicId)
        : undefined;
  let screen;
  if (route.name === "settings") screen = <Settings key={route.open} open={route.open} />;
  else if (route.name === "chart") screen = <Chart key={route.query} query={route.query} />;
  else if (route.name === "key") screen = <KeyView key={route.query} query={route.query} />;
  else if (route.name === "drill" && topic)
    screen = <Drill key={`${topic.id}?${route.only ?? ""}`} topic={topic} only={route.only} />;
  else if (route.name === "reference" && topic) screen = <Reference topic={topic} />;
  else screen = <Home />;

  return (
    <>
      {APP_ENV !== "prod" && (
        <div class="env-banner" role="status">
          {APP_ENV}（{APP_VERSION}）
        </div>
      )}
      <main
        class={
          [
            route.name === "chart" && "wide",
            route.name === "home" && "home",
            route.name === "key" && "key",
            tabOf(route) && "with-tabs",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        {screen}
      </main>
      <TabBar route={route} />
      <UpdatePrompt busy={route.name === "drill"} />
    </>
  );
}
