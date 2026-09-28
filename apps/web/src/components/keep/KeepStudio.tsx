"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { fetchAccountStatus, shortAddress, type AccountStatus } from "../../lib/keep/account";
import {
  KeepRequestError,
  getMemory,
  listMemory,
  postArtifact,
  putMemory,
} from "../../lib/keep/api";
import {
  formatCountdown,
  isSessionLive,
  sessionRemainingMs,
} from "../../lib/keep/session";
import {
  readCachedKeys,
  readManualChecks,
  readSessionToken,
  upsertCachedKey,
  writeCachedKeys,
  writeManualChecks,
  writeSessionToken,
  type CachedKey,
  type ManualChecks,
} from "../../lib/keep/storage";
import {
  KEEP_KINDS,
  artifactPriceMinor,
  assertKey,
  assertMemorySize,
  buildArtifactPointer,
  buildChecklist,
  buildJson,
  buildLink,
  buildMarkdown,
  buildMemoryFile,
  buildNote,
  buildScalar,
  classifyFile,
  formatMinor,
  kindLabel,
  type KeepKind,
} from "../../lib/keep/values";
import { keepRequestBase } from "../../lib/keep/api-base";
import { toWalletSigner } from "../../lib/keep/wallet-signer";
import { AgentSetup } from "./AgentSetup";
import { ValueView } from "./ValueView";

const API = process.env.NEXT_PUBLIC_API_BASE || "https://api.agentkeep.online";
const REQUEST_API = keepRequestBase(API);
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://agentkeep.online";

const WALLETS: { id: string; name: string; hint: string }[] = [
  { id: "pera", name: "Pera", hint: "QR on a computer, or the Pera app on a phone" },
  { id: "lute", name: "Lute", hint: "Browser extension" },
  { id: "defly", name: "Defly", hint: "QR, or the Defly app" },
  { id: "kibisis", name: "Kibisis", hint: "Browser extension" },
];

const KIND_LABEL: Record<KeepKind, string> = {
  note: "Note",
  markdown: "Markdown",
  json: "JSON",
  link: "Link",
  checklist: "Checklist",
  value: "Value",
  file: "File",
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function KeepStudio() {
  const { activeAddress, activeWallet, wallets, isReady, signTransactions } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [kind, setKind] = useState<KeepKind>("note");
  const [keyName, setKeyName] = useState("");
  const [note, setNote] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [json, setJson] = useState('{\n  "note": ""\n}');
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [checklist, setChecklist] = useState("");
  const [label, setLabel] = useState("");
  const [scalarMode, setScalarMode] = useState<"number" | "boolean">("number");
  const [scalarRaw, setScalarRaw] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"store" | "list" | "read" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [keys, setKeys] = useState<CachedKey[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reading, setReading] = useState<unknown | null>(null);
  const [pendingPayKey, setPendingPayKey] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [checks, setChecks] = useState<ManualChecks>(() => readManualChecks());
  const [now, setNow] = useState(() => Date.now());
  const [sessionRev, setSessionRev] = useState(0);

  const session = useMemo(() => {
    if (!activeAddress) return null;
    return readSessionToken(activeAddress);
  }, [activeAddress, sessionRev, now]);
  const live = isSessionLive(session, now);

  const signer = useMemo(() => {
    if (!activeAddress) return null;
    return toWalletSigner(activeAddress, (txns, indexes) => signTransactions(txns, indexes));
  }, [activeAddress, signTransactions]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live && selected) {
      setReading(null);
      setPendingPayKey(selected);
    }
  }, [live, selected]);

  useEffect(() => {
    if (!activeAddress) {
      setKeys([]);
      setAccount(null);
      setReading(null);
      setSelected(null);
      setPendingPayKey(null);
      return;
    }
    setKeys(readCachedKeys(activeAddress));
    let cancel = false;
    setAccountLoading(true);
    setAccountError(null);
    fetchAccountStatus(activeAddress)
      .then((status) => {
        if (!cancel) setAccount(status);
      })
      .catch((err: unknown) => {
        if (!cancel) {
          setAccountError(
            `${errorMessage(err)} You can still pay; the wallet will show the USDC transfer.`,
          );
        }
      })
      .finally(() => {
        if (!cancel) setAccountLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [activeAddress]);

  function rememberSession(token: string | null) {
    if (!activeAddress || !token) return;
    writeSessionToken(activeAddress, token);
    setSessionRev((n) => n + 1);
  }

  function updateChecks(next: ManualChecks) {
    setChecks(next);
    writeManualChecks(next);
  }

  async function connect(id: string) {
    setError(null);
    const wallet = wallets.find((item) => item.id === id);
    if (!wallet) {
      setError("That wallet is not ready yet.");
      return;
    }
    try {
      await wallet.connect();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function disconnect() {
    setError(null);
    try {
      await activeWallet?.disconnect();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function draftValue(): unknown {
    if (kind === "note") return buildNote(note);
    if (kind === "markdown") return buildMarkdown(markdown);
    if (kind === "json") return buildJson(json);
    if (kind === "link") return buildLink(linkTitle, linkUrl);
    if (kind === "checklist") return buildChecklist(checklist);
    return buildScalar(label, scalarMode, scalarMode === "boolean" ? scalarRaw || "false" : scalarRaw);
  }

  async function onStore(event: React.FormEvent) {
    event.preventDefault();
    setBusy("store");
    setError(null);
    setNotice(null);
    try {
      const key = assertKey(keyName);
      let value: unknown | undefined;
      let artifact: { mediaType: string } | null = null;
      if (kind === "file") {
        if (!file) throw new Error("Choose a file.");
        const plan = classifyFile(file);
        if (plan.mode === "blocked") throw new Error("HTML and JavaScript files are not stored.");
        if (plan.mode === "too-big") throw new Error("Files are limited to 10 MiB.");
        if (plan.mode === "text") {
          value = buildMemoryFile(file.name, plan.mediaType, await file.text());
        } else {
          artifact = { mediaType: plan.mediaType };
        }
      } else {
        value = draftValue();
      }
      if (value) assertMemorySize(value);
      if (!signer || !activeAddress) {
        throw new Error("Connect a wallet before storing.");
      }
      if (artifact && file) {
        const uploaded = await postArtifact(REQUEST_API, signer, file, artifact.mediaType);
        rememberSession(uploaded.session);
        value = buildArtifactPointer(file.name, artifact.mediaType, uploaded.url, uploaded.bytes);
        assertMemorySize(value);
      }
      if (!value) throw new Error("Nothing to store.");
      const saved = await putMemory(REQUEST_API, signer, key, value);
      rememberSession(saved.session);
      const next = upsertCachedKey(activeAddress, {
        key,
        kind,
        updatedAt: saved.result.updated_at,
      });
      setKeys(next);
      setSelected(key);
      setReading(value);
      setPendingPayKey(null);
      setNotice(`Stored ${key}. This wallet can read it free for 15 minutes.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function refreshList(): Promise<string | null> {
    if (!signer || !activeAddress) throw new Error("Connect a wallet first.");
    const listed = await listMemory(REQUEST_API, signer);
    rememberSession(listed.session);
    const merged = listed.keys.map((row) => ({
      key: row.key,
      updatedAt: row.updatedAt,
      expiresAt: typeof row.expiresAt === "number" ? row.expiresAt : undefined,
      kind: readCachedKeys(activeAddress).find((item) => item.key === row.key)?.kind,
    }));
    writeCachedKeys(activeAddress, merged);
    setKeys(merged);
    return listed.session;
  }

  async function onLoadList() {
    setBusy("list");
    setError(null);
    try {
      await refreshList();
      setNotice("List loaded. The read session is live for 15 minutes.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function openKey(key: string) {
    setSelected(key);
    setPendingPayKey(null);
    setError(null);
    if (!activeAddress) return;
    const token = readSessionToken(activeAddress);
    if (!isSessionLive(token)) {
      setReading(null);
      setPendingPayKey(key);
      return;
    }
    setBusy("read");
    try {
      const row = await getMemory(REQUEST_API, key, token!);
      setReading(row.value);
      const recordKind =
        row.value && typeof row.value === "object" && "kind" in row.value
          ? String((row.value as { kind: unknown }).kind)
          : undefined;
      if (recordKind) {
        setKeys(
          upsertCachedKey(activeAddress, {
            key,
            kind: recordKind,
            updatedAt: row.updated_at,
          }),
        );
      }
    } catch (err) {
      setReading(null);
      if (err instanceof KeepRequestError && err.status === 401) {
        setPendingPayKey(key);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  }

  async function payToRead(key: string) {
    setBusy("list");
    setError(null);
    try {
      const token = await refreshList();
      if (!token || !isSessionLive(token)) {
        throw new Error("Payment settled without a live session. Try the list again.");
      }
      const row = await getMemory(REQUEST_API, key, token);
      setPendingPayKey(null);
      setSelected(key);
      setReading(row.value);
      setNotice("Session refreshed. This read did not charge again.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const filePlan = file ? classifyFile(file) : null;
  const storeLabel = (() => {
    if (busy === "store") return "Waiting for the wallet…";
    if (filePlan?.mode === "artifact" && file) {
      return `Pay ${formatMinor(artifactPriceMinor(file.size))} to upload, then $0.001 to index`;
    }
    if (filePlan?.mode === "blocked" || filePlan?.mode === "too-big") return "Choose another file";
    return "Pay $0.001 and store";
  })();

  return (
    <div className="ak-keep">
      <div className="ak-grain" aria-hidden />
      <header className="ak-nav">
        <a href="/" className="ak-nav-brand">
          <Image src="/brand/logo-mark.svg" alt="" width={26} height={26} />
          <span className="ak-display">AgentKeep</span>
        </a>
        <nav className={`ak-nav-links${menuOpen ? " is-open" : ""}`}>
          <a href="/#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="/keep" onClick={() => setMenuOpen(false)} aria-current="page">
            Try
          </a>
          <a href="/skill" onClick={() => setMenuOpen(false)}>
            Agent skill
          </a>
          <a className="ak-mono" href={`${API}/llms.txt`}>
            llms.txt
          </a>
        </nav>
        <button
          type="button"
          className="ak-nav-toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </header>

      <main className="ak-keep-inner">
        <p className="ak-mono ak-rail">Try · Algorand Mainnet · USDC</p>
        <h1 className="ak-display">Store a value. Read it while the session is live.</h1>
        <p className="ak-keep-lede">
          Connect Pera, or a browser wallet. Each write is {formatMinor(1000)}. Reads are free for 15
          minutes after a settled payment, then you pay the list price to open them again.
        </p>
        <div className="ak-rule" style={{ transform: "scaleX(1)" }} />

        <section className="ak-keep-panel" aria-labelledby="wallet-heading">
          <h2 id="wallet-heading" className="ak-display">
            Wallet
          </h2>
          {activeAddress ? (
            <div className="ak-keep-connected">
              <p>
                <span className="ak-mono" title={activeAddress}>
                  {shortAddress(activeAddress)}
                </span>
                <span className={live ? "ak-keep-chip is-live" : "ak-keep-chip"}>
                  {live
                    ? `Session live · ${formatCountdown(sessionRemainingMs(session, now))}`
                    : "No live session"}
                </span>
              </p>
              <p className="ak-muted">
                {accountLoading
                  ? "Checking USDC on Mainnet…"
                  : account?.optedIn
                    ? `USDC ${formatMinor(account.usdcMinor)}`
                    : "USDC opt-in not seen yet."}
              </p>
              <button type="button" className="ak-btn-ghost" onClick={() => void disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <p className="ak-muted">
                On a computer, Pera shows a QR code for the phone app. On a phone, it opens Pera.
                Extensions sign in the browser. Mainnet only. This page never asks for a seed.
              </p>
              <div className="ak-keep-wallets">
                {WALLETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === "pera" ? "ak-keep-wallet is-primary" : "ak-keep-wallet"}
                    disabled={!isReady || busy !== null}
                    onClick={() => void connect(item.id)}
                  >
                    <span className="ak-display">{item.name}</span>
                    <span className="ak-muted">{item.hint}</span>
                  </button>
                ))}
              </div>
              {!isReady ? <p className="ak-mono ak-muted">Preparing wallets…</p> : null}
            </>
          )}
        </section>

        <div className="ak-keep-grid">
          <section className="ak-keep-panel">
            <h2 className="ak-display">Store</h2>
            <p className="ak-keep-warn">
              Do not store seeds, passwords, or private keys. Memory is private to the paying wallet.
              File links from artifacts are public.
            </p>
            <form onSubmit={(event) => void onStore(event)}>
              <label className="ak-keep-field">
                <span>Type</span>
                <select
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as KeepKind);
                    setFile(null);
                    setError(null);
                  }}
                >
                  {KEEP_KINDS.map((item) => (
                    <option key={item} value={item}>
                      {KIND_LABEL[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ak-keep-field">
                <span>Key</span>
                <input
                  className="ak-mono"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="trip-notes"
                  autoComplete="off"
                  maxLength={256}
                  required
                />
              </label>
              {kind === "note" || kind === "markdown" ? (
                <label className="ak-keep-field">
                  <span>{kind === "note" ? "Text" : "Markdown"}</span>
                  <textarea
                    value={kind === "note" ? note : markdown}
                    onChange={(event) =>
                      kind === "note" ? setNote(event.target.value) : setMarkdown(event.target.value)
                    }
                    rows={6}
                    required
                  />
                </label>
              ) : null}
              {kind === "json" ? (
                <label className="ak-keep-field">
                  <span>JSON object or array</span>
                  <textarea
                    className="ak-mono"
                    value={json}
                    onChange={(event) => setJson(event.target.value)}
                    rows={8}
                    required
                  />
                </label>
              ) : null}
              {kind === "link" ? (
                <>
                  <label className="ak-keep-field">
                    <span>Title</span>
                    <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} />
                  </label>
                  <label className="ak-keep-field">
                    <span>URL</span>
                    <input
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      inputMode="url"
                      required
                    />
                  </label>
                </>
              ) : null}
              {kind === "checklist" ? (
                <label className="ak-keep-field">
                  <span>Items, one per line. Prefix [x] to mark done.</span>
                  <textarea
                    value={checklist}
                    onChange={(event) => setChecklist(event.target.value)}
                    rows={6}
                    required
                  />
                </label>
              ) : null}
              {kind === "value" ? (
                <>
                  <label className="ak-keep-field">
                    <span>Label</span>
                    <input value={label} onChange={(event) => setLabel(event.target.value)} required />
                  </label>
                  <label className="ak-keep-field">
                    <span>Kind of value</span>
                    <select
                      value={scalarMode}
                      onChange={(event) =>
                        setScalarMode(event.target.value === "boolean" ? "boolean" : "number")
                      }
                    >
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </label>
                  {scalarMode === "number" ? (
                    <label className="ak-keep-field">
                      <span>Number</span>
                      <input
                        value={scalarRaw}
                        onChange={(event) => setScalarRaw(event.target.value)}
                        inputMode="decimal"
                        required
                      />
                    </label>
                  ) : (
                    <label className="ak-keep-field">
                      <span>Boolean</span>
                      <select value={scalarRaw || "false"} onChange={(event) => setScalarRaw(event.target.value)}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                  )}
                </>
              ) : null}
              {kind === "file" ? (
                <label className="ak-keep-field">
                  <span>File · text under 64 KiB stays in memory · other files become a public artifact</span>
                  <input
                    type="file"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}
              {filePlan?.mode === "artifact" ? (
                <p className="ak-keep-warn">
                  This upload is public at an artifact URL, then indexed in your memory for $0.001.
                  HTML and JavaScript are refused.
                </p>
              ) : null}
              {filePlan?.mode === "blocked" ? (
                <p className="ak-keep-error">HTML and JavaScript files are not accepted.</p>
              ) : null}
              {filePlan?.mode === "too-big" ? (
                <p className="ak-keep-error">That file is over 10 MiB.</p>
              ) : null}
              <p className="ak-muted ak-keep-hint">Memory values are capped at 64 KiB.</p>
              {REQUEST_API === "" ? (
                <p className="ak-muted ak-keep-hint">
                  This preview sends the payment through the local dev server to {API}. Restart the
                  web dev server if this tab was already open. Connect Pera with Mainnet USDC, then
                  pay.
                </p>
              ) : null}
              <button
                type="submit"
                className="ak-btn-primary"
                disabled={busy !== null || filePlan?.mode === "blocked" || filePlan?.mode === "too-big"}
              >
                {storeLabel}
              </button>
            </form>
          </section>

          <section className="ak-keep-panel">
            <div className="ak-keep-list-head">
              <h2 className="ak-display">Your memory</h2>
              <button
                type="button"
                className="ak-btn-ghost"
                disabled={!activeAddress || busy !== null}
                onClick={() => void onLoadList()}
              >
                {busy === "list" ? "Waiting for the wallet…" : "Load list · $0.001"}
              </button>
            </div>
            {!activeAddress ? (
              <p className="ak-muted">Connect a wallet to see the keys it has paid to store.</p>
            ) : keys.length === 0 ? (
              <p className="ak-muted">
                No keys loaded yet. Store something, or pay $0.001 to list what this wallet already
                keeps. Connecting alone does not load keys.
              </p>
            ) : (
              <ul className="ak-keep-keys">
                {keys.map((row) => {
                  const rowLive = live;
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        className={selected === row.key ? "is-on" : ""}
                        onClick={() => void openKey(row.key)}
                      >
                        <span className="ak-mono">{row.key}</span>
                        <span className="ak-muted">{kindLabel(row.kind)}</span>
                        <span className={rowLive ? "ak-keep-chip is-live" : "ak-keep-chip"}>
                          {rowLive
                            ? `Live · ${formatCountdown(sessionRemainingMs(session, now))}`
                            : "Pay to read"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {pendingPayKey ? (
              <div className="ak-keep-readout">
                <p>
                  The session for this wallet has ended. Reading <span className="ak-mono">{pendingPayKey}</span>{" "}
                  is free only while a session is live. Paying $0.001 reloads the key list, mints a new
                  15-minute session, and then fetches this value. The value itself is not overwritten.
                </p>
                <button
                  type="button"
                  className="ak-btn-primary"
                  disabled={busy !== null}
                  onClick={() => void payToRead(pendingPayKey)}
                >
                  Pay $0.001 to read
                </button>
              </div>
            ) : null}

            {selected && reading !== null && !pendingPayKey ? (
              <div className="ak-keep-readout" aria-live="polite">
                <p className="ak-mono ak-muted">{selected}</p>
                {busy === "read" ? <p className="ak-muted">Fetching…</p> : <ValueView value={reading} />}
              </div>
            ) : null}
          </section>
        </div>

        {error ? (
          <p className="ak-keep-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="ak-keep-notice">{notice}</p> : null}

        <AgentSetup
          apiBase={API}
          siteUrl={SITE}
          checks={checks}
          onChecks={updateChecks}
          connected={Boolean(activeAddress)}
          account={account}
          accountError={accountError}
          accountLoading={accountLoading}
        />
      </main>
    </div>
  );
}
