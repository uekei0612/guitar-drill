import { APP_ENV, APP_VERSION } from "./env";

export function App() {
  return (
    <>
      {APP_ENV !== "prod" && (
        <div class="env-banner" role="status">
          {APP_ENV}（{APP_VERSION}）
        </div>
      )}
      <main>
        <h1>guitar-drill</h1>
        <p>ギタリストが覚えることを、初心者→中級者→上級者の順に覚えていく暗記ドリル。</p>
      </main>
    </>
  );
}
