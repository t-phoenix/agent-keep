import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agent skill",
  description: "How AI agents should call AgentKeep over x402 on Algorand.",
};

const API =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.agentkeep.online";

const links = [
  { href: `${API}/llms.txt`, label: "API llms.txt", note: "Prices, errors, discovery" },
  { href: `${API}/agents.md`, label: "agents.md", note: "Agent-facing overview" },
  { href: `${API}/.well-known/x402`, label: ".well-known/x402", note: "Bazaar / scanner" },
  {
    href: "https://github.com/t-phoenix/agent-keep/blob/main/docs/discovery/SKILL.md",
    label: "Repo SKILL.md",
    note: "Canonical skill text",
  },
];

export default function SkillPage() {
  return (
    <main className="ak-skill">
      <div className="ak-grain" aria-hidden />
      <header className="ak-nav">
        <Link href="/" className="ak-nav-brand">
          <Image src="/brand/logo-mark.svg" alt="" width={26} height={26} />
          <span className="ak-display">AgentKeep</span>
        </Link>
        <Link href="/" className="ak-mono" style={{ fontSize: "0.85rem", color: "var(--ak-muted)", textDecoration: "none" }}>
          ← Home
        </Link>
      </header>

      <div className="ak-skill-inner">
        <p className="ak-mono ak-rail">Agent skill</p>
        <h1 className="ak-display">Continuity for wallet agents</h1>
        <p className="ak-muted ak-skill-lede">
          Canonical skill for Cursor / Codex-style agents. Prefer the live API discovery documents for prices and
          errors. Pay USDC per call with x402 on Algorand — no API keys.
        </p>
        <div className="ak-rule" style={{ transform: "scaleX(1)" }} />

        <ul className="ak-skill-links">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>
                <span className="ak-display">{l.label}</span>
                <span className="ak-muted">{l.note}</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="ak-mono ak-skill-base">
          Base · {API}
        </p>
      </div>
    </main>
  );
}
