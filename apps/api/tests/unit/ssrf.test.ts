import { describe, expect, it } from "vitest";
import { assertSafeUrlString } from "../../src/lib/ssrf.js";
import { AppError } from "../../src/errors.js";

describe("ssrf", () => {
  const cases: Array<{ url: string; ok: boolean }> = [
    { url: "https://example.com/x", ok: true },
    { url: "http://example.com", ok: true },
    { url: "https://127.0.0.1/", ok: false },
    { url: "http://10.0.0.1/a", ok: false },
    { url: "http://192.168.1.1", ok: false },
    { url: "http://169.254.169.254/latest", ok: false },
    { url: "http://localhost/admin", ok: false },
    { url: "file:///etc/passwd", ok: false },
    { url: "https://user:pass@example.com", ok: false },
  ];

  for (const c of cases) {
    it(`${c.ok ? "allows" : "blocks"} ${c.url}`, () => {
      if (c.ok) {
        expect(assertSafeUrlString(c.url).hostname).toBeTruthy();
      } else {
        expect(() => assertSafeUrlString(c.url)).toThrow(AppError);
      }
    });
  }
});
