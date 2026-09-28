import type { KeepRecord } from "../../lib/keep/values";
import { asKeepRecord } from "../../lib/keep/values";

function MarkdownView({ text }: { text: string }) {
  return (
    <div className="ak-keep-md">
      {text.split("\n").map((line, index) => {
        if (line.startsWith("### ")) return <h4 key={index}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h3 key={index}>{line.slice(2)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <p key={index} className="ak-keep-md-item">
              {line.slice(2)}
            </p>
          );
        }
        if (!line.trim()) return <div key={index} className="ak-keep-md-gap" />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function httpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function RecordView({ record }: { record: KeepRecord | { kind: "raw"; value: unknown } }) {
  if (record.kind === "note") return <p className="ak-keep-read">{record.text}</p>;
  if (record.kind === "markdown") return <MarkdownView text={record.text} />;
  if (record.kind === "json" || record.kind === "raw") {
    const data = record.kind === "json" ? record.data : record.value;
    return <pre className="ak-mono ak-keep-pre">{JSON.stringify(data, null, 2)}</pre>;
  }
  if (record.kind === "link") {
    return (
      <p>
        <a href={record.url}>{record.title}</a>
        <span className="ak-mono ak-muted ak-keep-url">{record.url}</span>
      </p>
    );
  }
  if (record.kind === "checklist") {
    return (
      <ul className="ak-keep-checks">
        {record.items.map((item) => (
          <li key={item.text}>
            <span aria-hidden>{item.done ? "☑" : "☐"}</span> {item.text}
          </li>
        ))}
      </ul>
    );
  }
  if (record.kind === "value") {
    const shown =
      typeof record.flag === "boolean" ? (record.flag ? "true" : "false") : String(record.number);
    return (
      <p className="ak-keep-read">
        <span className="ak-muted">{record.label}</span>{" "}
        <span className="ak-mono">{shown}</span>
      </p>
    );
  }
  if (record.storage === "memory") {
    return (
      <div>
        <p className="ak-mono ak-muted">
          {record.name} · {record.mediaType}
        </p>
        <pre className="ak-mono ak-keep-pre">{record.text}</pre>
      </div>
    );
  }
  const showImage = record.mediaType.startsWith("image/") && httpUrl(record.url);
  return (
    <div>
      <p className="ak-muted">This file URL is public.</p>
      {showImage ? (
        // Artifact URLs are public bytes, not a Next image pipeline.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ak-keep-image" src={record.url} alt={record.name} />
      ) : null}
      {httpUrl(record.url) ? (
        <a href={record.url}>
          {record.name} · {record.bytes.toLocaleString()} bytes
        </a>
      ) : (
        <p className="ak-mono">{record.url}</p>
      )}
    </div>
  );
}

export function ValueView({ value }: { value: unknown }) {
  return <RecordView record={asKeepRecord(value)} />;
}
