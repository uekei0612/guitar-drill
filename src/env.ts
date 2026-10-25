/* 開発と本番の見分け。静的配信なので /health は持たず、ビルド時の環境変数で決める。
   本番ビルド（GitHub Actions）は VITE_APP_ENV=prod と VITE_APP_VERSION=sha-xxxxxxx を渡す。 */
export const APP_ENV: string = import.meta.env.VITE_APP_ENV ?? (import.meta.env.DEV ? "dev" : "local");
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? "dev-local";
