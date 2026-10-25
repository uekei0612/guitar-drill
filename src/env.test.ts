import { describe, expect, it } from "vitest";
import { APP_ENV, APP_VERSION } from "./env";

describe("env", () => {
  it("開発では dev と表示する", () => {
    expect(APP_ENV).toBe("dev");
    expect(APP_VERSION).toBe("dev-local");
  });
});
