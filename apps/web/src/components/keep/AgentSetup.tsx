"use client";

import { useState } from "react";
import type { AccountStatus } from "../../lib/keep/account";
import { agentPrompt, envConfig } from "../../lib/keep/prompt";
import type { ManualChecks } from "../../lib/keep/storage";
import { formatMinor, MIN_WRITE_MINOR } from "../../lib/keep/values";

const MANUAL: { id: keyof ManualChecks; label: string }[] = [
  {
    id: "sessionRule",
    label: "I understand a free read lasts 15 minutes, then I pay $0.001 to refresh the list and read again.",
  },
  {
    id: "noSecrets",
    label: "I will not put seeds, passwords, or private keys in memory or files.",
  },
  {
    id: "publicArtifacts",
    label: "I understand artifact links are public.",
  },
  {
    id: "pastedPrompt",
    label: "I pasted the prompt into my agent.",
  },
];

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AgentSetup({
  apiBase,
  siteUrl,
  checks,
  onChecks,
  connected,
  account,
  accountError,
  accountLoading,
}: {
  apiBase: string;
  siteUrl: string;
  checks: ManualChecks;
  onChecks: (next: ManualChecks) => void;
  connected: boolean;
  account: AccountStatus | null;
  accountError: string | null;
  accountLoading: boolean;
}) {
  const prompt = agentPrompt({ apiBase, siteUrl });
  const env = envConfig(apiBase);
  const [copied, setCopied] = useState<"prompt" | "env" | null>(null);
  const funded = Boolean(account && account.usdcMinor >= MIN_WRITE_MINOR);

  async function onCopyPrompt() {
    const ok = await copy(prompt);
    setCopied(ok ? "prompt" : null);
  }

  async function onCopyEnv() {
    const ok = await copy(env);
    if (ok) {
      setCopied("env");
      onChecks({ ...checks, apiCopied: true });
    }
  }

  const auto: { ok: boolean; label: string; pending?: boolean; detail?: string }[] = [
    { ok: connected, label: "Mainnet wallet connected" },
    {
      ok: Boolean(account?.optedIn),
      label: "Account opted into USDC ASA 31566704",
      pending: connected && accountLoading,
    },
    {
      ok: funded,
      label: `USDC balance covers a write (${formatMinor(MIN_WRITE_MINOR)})`,
      pending: connected && accountLoading,
      detail: account ? formatMinor(account.usdcMinor) : undefined,
    },
  ];

  return (
    <section className="ak-keep-panel" id="setup">
      <p className="ak-mono ak-rail">Use it from an agent</p>
      <h2 className="ak-display">Paste this into your agent</h2>
      <p className="ak-muted">
        The prompt points at the live skill and the exact payment config. Copy it into Cursor, Claude,
        ChatGPT, or any other tool that can call HTTP.
      </p>
      <pre className="ak-mono ak-keep-pre ak-keep-prompt">{prompt}</pre>
      <div className="ak-keep-actions">
        <button type="button" className="ak-btn-primary" onClick={() => void onCopyPrompt()}>
          {copied === "prompt" ? "Copied" : "Copy prompt"}
        </button>
      </div>

      <h3 className="ak-display ak-keep-sub">Config</h3>
      <pre className="ak-mono ak-keep-pre">{env}</pre>
      <div className="ak-keep-actions">
        <button type="button" className="ak-btn-ghost" onClick={() => void onCopyEnv()}>
          {copied === "env" ? "Copied" : "Copy config"}
        </button>
      </div>

      <h3 className="ak-display ak-keep-sub">Setup checklist</h3>
      {accountError ? <p className="ak-keep-error">{accountError}</p> : null}
      <ul className="ak-keep-status">
        {auto.map((row) => (
          <li key={row.label}>
            <span className={row.ok ? "ak-keep-mark is-on" : "ak-keep-mark"} aria-hidden>
              {row.ok ? "●" : "○"}
            </span>
            <span>
              {row.label}
              {row.pending ? <span className="ak-muted"> · checking</span> : null}
              {row.detail && row.ok ? <span className="ak-mono ak-muted"> · {row.detail}</span> : null}
            </span>
          </li>
        ))}
        <li>
          <span className={checks.apiCopied ? "ak-keep-mark is-on" : "ak-keep-mark"} aria-hidden>
            {checks.apiCopied ? "●" : "○"}
          </span>
          <span>API base copied ({apiBase})</span>
        </li>
      </ul>
      <ul className="ak-keep-manual">
        {MANUAL.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={checks[item.id]}
                onChange={(event) => onChecks({ ...checks, [item.id]: event.target.checked })}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
