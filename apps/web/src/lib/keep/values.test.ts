import { describe, expect, it } from "vitest";
import {
  MEMORY_MAX_BYTES,
  artifactPriceMinor,
  assertMemorySize,
  buildChecklist,
  buildJson,
  buildLink,
  buildMarkdown,
  buildMemoryFile,
  buildNote,
  buildScalar,
  classifyFile,
  formatMinor,
  isBlockedUpload,
} from "./values";

describe("memory values", () => {
  it("builds each in-memory kind", () => {
    expect(buildNote("  hello  ")).toEqual({ kind: "note", text: "hello" });
    expect(buildMarkdown("# Title")).toEqual({ kind: "markdown", text: "# Title" });
    expect(buildJson('{"a":1}')).toEqual({ kind: "json", data: { a: 1 } });
    expect(buildJson("[1]").data).toEqual([1]);
    expect(buildLink("Docs", "https://agentkeep.online/skill")).toMatchObject({
      kind: "link",
      title: "Docs",
    });
    expect(buildChecklist("[x] done\nopen").items).toEqual([
      { text: "done", done: true },
      { text: "open", done: false },
    ]);
    expect(buildScalar("cap", "number", "2")).toEqual({ kind: "value", label: "cap", number: 2 });
    expect(buildScalar("live", "boolean", "true").flag).toBe(true);
    expect(buildMemoryFile("note.txt", "text/plain", "hi").storage).toBe("memory");
  });

  it("rejects invalid JSON, empty notes, and oversize values", () => {
    expect(() => buildJson("[][]")).toThrow(/JSON/);
    expect(() => buildJson("1")).toThrow(/object or an array/);
    expect(() => buildNote("   ")).toThrow(/note/);
    const huge = { kind: "note", text: "x".repeat(MEMORY_MAX_BYTES) };
    expect(() => assertMemorySize(huge)).toThrow(/64 KiB/);
  });

  it("refuses HTML and JavaScript uploads", () => {
    expect(isBlockedUpload("page.html", "text/html")).toBe(true);
    expect(isBlockedUpload("app.js", "text/javascript")).toBe(true);
    expect(isBlockedUpload("pic.png", "image/png")).toBe(false);
    expect(classifyFile({ name: "page.html", type: "text/html", size: 20 }).mode).toBe("blocked");
    expect(classifyFile({ name: "note.txt", type: "text/plain", size: 20 }).mode).toBe("text");
    expect(classifyFile({ name: "pic.png", type: "image/png", size: 20 }).mode).toBe("artifact");
  });

  it("prices artifacts and formats minor units", () => {
    expect(artifactPriceMinor(100)).toBe(5_000);
    expect(artifactPriceMinor(1024 * 1024 + 1)).toBe(7_000);
    expect(formatMinor(1_000)).toBe("$0.001");
    expect(formatMinor(5_000)).toBe("$0.005");
    expect(formatMinor(2_000_000)).toBe("$2.00");
  });
});
