export const MEMORY_MAX_BYTES = 64 * 1024;
export const ARTIFACT_MAX_BYTES = 10 * 1024 * 1024;
export const MEMORY_PRICE_MINOR = 1_000;
export const ARTIFACT_PRICE_MINOR = 5_000;
export const ARTIFACT_EXTRA_MIB_MINOR = 2_000;
export const USDC_ASA_ID = 31566704;
export const MIN_WRITE_MINOR = MEMORY_PRICE_MINOR;

const KEY_RE = /^[A-Za-z0-9._:-]{1,256}$/;
const TEXT_EXT = new Set(["txt", "md", "markdown", "json", "csv"]);

export const KEEP_KINDS = [
  "note",
  "markdown",
  "json",
  "link",
  "checklist",
  "value",
  "file",
] as const;

export type KeepKind = (typeof KEEP_KINDS)[number];

export type NoteValue = { kind: "note"; text: string };
export type MarkdownValue = { kind: "markdown"; text: string };
export type JsonValue = { kind: "json"; data: unknown };
export type LinkValue = { kind: "link"; title: string; url: string };
export type ChecklistValue = {
  kind: "checklist";
  items: { text: string; done: boolean }[];
};
export type ScalarValue = {
  kind: "value";
  label: string;
  number?: number;
  flag?: boolean;
};
export type MemoryFileValue = {
  kind: "file";
  storage: "memory";
  name: string;
  mediaType: string;
  text: string;
};
export type ArtifactFileValue = {
  kind: "file";
  storage: "artifact";
  name: string;
  mediaType: string;
  url: string;
  bytes: number;
};

export type KeepRecord =
  | NoteValue
  | MarkdownValue
  | JsonValue
  | LinkValue
  | ChecklistValue
  | ScalarValue
  | MemoryFileValue
  | ArtifactFileValue;

export function utf8Bytes(value: unknown): number {
  const serialized = JSON.stringify(value);
  return new TextEncoder().encode(serialized).length;
}

export function assertMemorySize(value: unknown): number {
  const n = utf8Bytes(value);
  if (n > MEMORY_MAX_BYTES) {
    throw new Error(
      "This value is over 64 KiB. Shorten it, or upload a file as a public artifact.",
    );
  }
  return n;
}

export function assertKey(key: string): string {
  const trimmed = key.trim();
  if (!KEY_RE.test(trimmed)) {
    throw new Error(
      "Use a key of letters, numbers, and . _ : - (256 characters or fewer).",
    );
  }
  return trimmed;
}

export function buildNote(text: string): NoteValue {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Write a note first.");
  return { kind: "note", text: trimmed };
}

export function buildMarkdown(text: string): MarkdownValue {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Write some markdown first.");
  return { kind: "markdown", text: trimmed };
}

export function buildJson(raw: string): JsonValue {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("That is not valid JSON.");
  }
  if (data === null || typeof data !== "object") {
    throw new Error("JSON memory expects an object or an array.");
  }
  return { kind: "json", data };
}

export function buildLink(title: string, url: string): LinkValue {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("Enter a full URL, including https.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Use an http or https link.");
  }
  return { kind: "link", title: title.trim() || parsed.hostname, url: parsed.toString() };
}

export function buildChecklist(lines: string): ChecklistValue {
  const items = lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const done = /^\[x\]\s+/i.test(line);
      const text = line.replace(/^\[(x|\s)?\]\s+/i, "");
      return { text, done };
    })
    .filter((item) => item.text.length > 0);
  if (items.length === 0) throw new Error("Add at least one checklist item.");
  return { kind: "checklist", items };
}

export function buildScalar(
  label: string,
  mode: "number" | "boolean",
  raw: string,
): ScalarValue {
  if (!label.trim()) throw new Error("Add a label.");
  if (mode === "boolean") {
    return { kind: "value", label: label.trim(), flag: raw === "true" };
  }
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new Error("Enter a number.");
  return { kind: "value", label: label.trim(), number };
}

export function buildMemoryFile(name: string, mediaType: string, text: string): MemoryFileValue {
  if (!text) throw new Error("That file is empty.");
  return {
    kind: "file",
    storage: "memory",
    name,
    mediaType: mediaType || "text/plain",
    text,
  };
}

export function buildArtifactPointer(
  name: string,
  mediaType: string,
  url: string,
  bytes: number,
): ArtifactFileValue {
  return {
    kind: "file",
    storage: "artifact",
    name,
    mediaType: mediaType || "application/octet-stream",
    url,
    bytes,
  };
}

export function isBlockedUpload(name: string, mediaType: string): boolean {
  const type = mediaType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    type === "text/html" ||
    type === "application/javascript" ||
    type === "text/javascript" ||
    type === "application/x-javascript" ||
    type.includes("html") ||
    type.includes("javascript")
  ) {
    return true;
  }
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".html") ||
    lower.endsWith(".htm") ||
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs")
  );
}

export type FilePlan =
  | { mode: "blocked" }
  | { mode: "too-big" }
  | { mode: "text"; mediaType: string }
  | { mode: "artifact"; mediaType: string };

export function classifyFile(file: { name: string; type: string; size: number }): FilePlan {
  if (isBlockedUpload(file.name, file.type)) return { mode: "blocked" };
  if (file.size > ARTIFACT_MAX_BYTES) return { mode: "too-big" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const textual =
    TEXT_EXT.has(ext) || file.type.startsWith("text/") || file.type === "application/json";
  const mediaType = file.type || (textual ? "text/plain" : "application/octet-stream");
  if (textual && file.size <= MEMORY_MAX_BYTES && !file.type.startsWith("image/")) {
    return { mode: "text", mediaType };
  }
  return { mode: "artifact", mediaType };
}

/** Base $0.005, plus $0.002 for each MiB after the first (same rule as the API). */
export function artifactPriceMinor(bytes: number): number {
  const extraMiB = Math.max(0, Math.ceil(bytes / (1024 * 1024)) - 1);
  return ARTIFACT_PRICE_MINOR + extraMiB * ARTIFACT_EXTRA_MIB_MINOR;
}

export function formatMinor(minor: number): string {
  const dollars = minor / 1_000_000;
  const trimmed = dollars.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, frac = ""] = trimmed.split(".");
  const digits = (frac + "00").slice(0, Math.max(2, frac.length));
  return `$${whole}.${digits}`;
}

export function kindLabel(kind: string | undefined): string {
  switch (kind) {
    case "note":
      return "Note";
    case "markdown":
      return "Markdown";
    case "json":
      return "JSON";
    case "link":
      return "Link";
    case "checklist":
      return "Checklist";
    case "value":
      return "Value";
    case "file":
      return "File";
    default:
      return "Memory";
  }
}

export function asKeepRecord(value: unknown): KeepRecord | { kind: "raw"; value: unknown } {
  if (value && typeof value === "object" && "kind" in value) {
    const kind = (value as { kind?: unknown }).kind;
    if (typeof kind === "string" && (KEEP_KINDS as readonly string[]).includes(kind)) {
      return value as KeepRecord;
    }
  }
  if (typeof value === "string") return { kind: "note", text: value };
  return { kind: "raw", value };
}
