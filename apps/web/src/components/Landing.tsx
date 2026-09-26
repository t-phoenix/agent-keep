"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef, useState } from "react";
import { HeroScene } from "./HeroScene";

gsap.registerPlugin(ScrollTrigger);

const API =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.agentkeep.online";

const chapters = [
  { id: "keep", label: "Keep", line: "State that survives the next tool call." },
  { id: "pay", label: "Pay", line: "x402 USDC on Algorand — no API keys." },
  { id: "trust", label: "Trust", line: "Hard caps, receipts, owner-bound notify." },
];

const features = [
  {
    title: "Memory",
    price: "$0.001",
    body: "Wallet-scoped key/value ≤64KiB. PUT paid; GET free with session. Cross-wallet → 404.",
    route: "PUT /v1/memory/{key}",
  },
  {
    title: "Artifacts",
    price: "$0.005+",
    body: "Upload bytes → public HTTPS URL + sha256. No IAM. HTML/JS blocked.",
    route: "POST /v1/artifacts",
  },
  {
    title: "Notify",
    price: "$0.02",
    body: "Owner-bound email approve/deny. Returns pending; agents poll — never blocks.",
    route: "POST /v1/notify",
  },
  {
    title: "Fetch",
    price: "$0.01",
    body: "Server-side HTTPS fetch with shared SSRF denylist. Truncated body + receipt.",
    route: "POST /v1/fetch",
  },
  {
    title: "Trust",
    price: "$0.002",
    body: "Probe a URL for reachability and x402 Payment-Required signals (≤3s).",
    route: "GET /v1/trust",
  },
  {
    title: "Budget",
    price: "free / $0.002",
    body: "Hard daily cap default $2. Free budget GET with session; paid receipt export.",
    route: "GET /v1/budget",
  },
];

const useCases = [
  {
    who: "Runner agent",
    need: "Remember mid-task conclusions across tools",
    do: "PUT memory → work elsewhere → GET with session",
  },
  {
    who: "Principal",
    need: "Fund a wallet without runaway spend",
    do: "Default $2/day cap + kill switch + receipts",
  },
  {
    who: "Integrator",
    need: "Ship continuity without Redis or S3 keys",
    do: "Wrap the AgentKeep skill; users pay x402",
  },
  {
    who: "High-stakes loop",
    need: "Human gate before irreversible action",
    do: "Bind email → POST notify → poll until approved",
  },
];

const howSteps = [
  {
    n: "01",
    t: "Call unpaid",
    d: "Hit a paid route without proof → HTTP 402 + PAYMENT-REQUIRED (Algorand USDC ASA 31566704, tag x402-global-challenge).",
  },
  {
    n: "02",
    t: "Settle",
    d: "Any x402 Algorand client pays the exact amount to payTo via GoPlausible, then retries with PAYMENT-SIGNATURE.",
  },
  {
    n: "03",
    t: "Keep session",
    d: "On settle, store X-AgentKeep-Session (15m). Free Memory GET / Budget GET without another 402.",
  },
  {
    n: "04",
    t: "Branch on errors",
    d: "Use catalog codes only: budget_exceeded, ssrf_blocked, channel_not_bound, payment_replay…",
  },
];

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || !stage.current) return;

      const st = ScrollTrigger.create({
        trigger: stage.current,
        start: "top top",
        end: "+=260%",
        pin: true,
        scrub: 0.55,
        onUpdate: (self) => {
          setProgress(self.progress);
          setChapter(Math.min(2, Math.floor(self.progress * 3)));
        },
      });

      gsap.utils.toArray<HTMLElement>(".ak-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".ak-line-draw").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1,
            ease: "power2.out",
            transformOrigin: "left center",
            scrollTrigger: { trigger: el, start: "top 90%" },
          },
        );
      });

      return () => st.kill();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="ak-root">
      <div className="ak-grain" aria-hidden />

      <header className="ak-nav">
        <a href="/" className="ak-nav-brand">
          <Image src="/brand/logo-mark.svg" alt="" width={26} height={26} priority />
          <span className="ak-display">AgentKeep</span>
        </a>
        <nav className={`ak-nav-links${menuOpen ? " is-open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How
          </a>
          <a href="#usecases" onClick={() => setMenuOpen(false)}>
            Use cases
          </a>
          <a href="#developers" onClick={() => setMenuOpen(false)}>
            Developers
          </a>
          <a href="#prices" onClick={() => setMenuOpen(false)}>
            Prices
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
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </header>

      {/* Full-bleed hero — brand + one line + CTAs over 3D */}
      <section ref={stage} className="ak-stage">
        <div className="ak-stage-canvas" aria-hidden>
          <HeroScene progress={progress} />
        </div>
        <div className="ak-stage-veil" aria-hidden />

        <div className="ak-stage-inner">
          <p className="ak-mono ak-rail">x402 · Algorand · GoPlausible</p>
          <h1 className="ak-display ak-title">AgentKeep</h1>
          <p className="ak-display ak-tagline">Keep going.</p>
          <p className="ak-lede">
            Wallet-scoped OS primitives for AI agents — memory, artifacts, human notify, fetch, trust,
            receipts. Pay USDC per call. No signup.
          </p>
          <div className="ak-cta-row">
            <a className="ak-btn-primary" href={API}>
              Call the API
            </a>
            <a className="ak-btn-ghost" href="/skill">
              Agent skill
            </a>
          </div>

          <div className="ak-chapter-bar" aria-label="Scroll chapters">
            {chapters.map((c, i) => (
              <div key={c.id} className={`ak-chapter${i === chapter ? " is-active" : ""}`}>
                <span className="ak-mono">{c.label}</span>
                <span className="ak-chapter-line">{c.line}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ak-scroll-hint ak-mono" aria-hidden>
          Scroll
          <span className="ak-scroll-line" />
        </div>
      </section>

      <section id="features" className="ak-section">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">01 — Primitives</p>
          <h2 className="ak-display">Everything an agent needs to keep going</h2>
          <p className="ak-muted">
            One Mainnet payTo. Concrete Bazaar routes. Challenge tag{" "}
            <code className="ak-mono">x402-global-challenge</code>.
          </p>
          <div className="ak-line-draw ak-rule" />
        </div>

        <ul className="ak-feature-list">
          {features.map((f, i) => (
            <li key={f.title} className="ak-feature-row ak-reveal">
              <span className="ak-mono ak-feature-ix">{String(i + 1).padStart(2, "0")}</span>
              <div className="ak-feature-main">
                <div className="ak-feature-title-row">
                  <h3 className="ak-display">{f.title}</h3>
                  <span className="ak-mono ak-price">{f.price}</span>
                </div>
                <p className="ak-muted">{f.body}</p>
              </div>
              <code className="ak-mono ak-route">{f.route}</code>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="ak-section ak-section-deep">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">02 — How</p>
          <h2 className="ak-display">From unpaid 402 to a session</h2>
          <p className="ak-muted">Four steps. No signup. No dashboard.</p>
          <div className="ak-line-draw ak-rule" />
        </div>

        <ol className="ak-how">
          {howSteps.map((s) => (
            <li key={s.n} className="ak-how-item ak-reveal">
              <span className="ak-mono ak-how-n">{s.n}</span>
              <h3 className="ak-display">{s.t}</h3>
              <p className="ak-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="usecases" className="ak-section">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">03 — Use cases</p>
          <h2 className="ak-display">Who pays, what they keep</h2>
          <div className="ak-line-draw ak-rule" />
        </div>

        <div className="ak-usecases">
          {useCases.map((u) => (
            <article key={u.who} className="ak-usecase ak-reveal">
              <p className="ak-mono ak-rail">{u.who}</p>
              <h3 className="ak-display">{u.need}</h3>
              <p className="ak-muted">{u.do}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="developers" className="ak-section ak-section-deep">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">04 — Developers</p>
          <h2 className="ak-display">Copy, settle, keep</h2>
          <p className="ak-muted">
            Live base <code className="ak-mono">{API}</code>
          </p>
          <div className="ak-line-draw ak-rule" />
        </div>

        <div className="ak-terminals">
          <div className="ak-terminal ak-reveal">
            <div className="ak-terminal-bar">
              <span className="ak-mono">memory · unpaid → 402</span>
            </div>
            <pre>{`curl -i -X PUT ${API}/v1/memory/plan \\
  -H 'content-type: application/json' \\
  -d '{"value":{"step":1,"note":"keep going"}}'`}</pre>
          </div>

          <div className="ak-terminal ak-reveal">
            <div className="ak-terminal-bar">
              <span className="ak-mono">session · free GET</span>
            </div>
            <pre>{`curl -s ${API}/v1/memory/plan \\
  -H "x-agentkeep-session: $SESSION"`}</pre>
          </div>

          <div className="ak-terminal ak-reveal">
            <div className="ak-terminal-bar">
              <span className="ak-mono">fetch · SSRF-guarded</span>
            </div>
            <pre>{`curl -s -X POST ${API}/v1/fetch \\
  -H 'content-type: application/json' \\
  -H "payment-signature: $PROOF" \\
  -d '{"url":"https://example.com","max_bytes":8000}'`}</pre>
          </div>

          <div className="ak-terminal ak-reveal">
            <div className="ak-terminal-bar">
              <span className="ak-mono">notify · bind then ticket</span>
            </div>
            <pre>{`curl -s -X POST ${API}/v1/owner/bind/email \\
  -H "payment-signature: $PROOF" \\
  -H 'content-type: application/json' \\
  -d '{"email":"you@example.com"}'

curl -s -X POST ${API}/v1/notify \\
  -H "payment-signature: $PROOF" \\
  -H 'content-type: application/json' \\
  -d '{"question":"Approve $0.05 fetch?"}'`}</pre>
          </div>
        </div>

        <p className="ak-dev-links ak-reveal ak-muted">
          <a href="/skill">Agent skill</a>
          <span aria-hidden>·</span>
          <a href={`${API}/.well-known/x402`}>.well-known/x402</a>
          <span aria-hidden>·</span>
          <a href={`${API}/llms.txt`}>llms.txt</a>
        </p>
      </section>

      <section id="prices" className="ak-section">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">05 — Prices</p>
          <h2 className="ak-display">USDC per call</h2>
          <p className="ak-muted">Default hard daily cap $2. Habit prices for loops; notify prices human attention.</p>
          <div className="ak-line-draw ak-rule" />
        </div>

        <div className="ak-prices ak-reveal">
          {features.map((f) => (
            <div key={f.route} className="ak-price-row">
              <span className="ak-mono ak-route">{f.route}</span>
              <span className="ak-mono ak-price">{f.price}</span>
              <span className="ak-muted ak-price-job">{f.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="ak-section ak-section-deep">
        <div className="ak-section-head ak-reveal">
          <p className="ak-mono ak-rail">06 — FAQ</p>
          <h2 className="ak-display">Straight answers</h2>
          <div className="ak-line-draw ak-rule" />
        </div>

        <div className="ak-faq">
          <div className="ak-faq-item ak-reveal">
            <h3 className="ak-display">What is AgentKeep?</h3>
            <p className="ak-muted">
              A wallet-scoped continuity OS for AI agents: memory, artifacts, owner-bound notify, fetch, trust, and
              receipts. Pay USDC per call with x402 on Algorand. No signup.
            </p>
          </div>
          <div className="ak-faq-item ak-reveal">
            <h3 className="ak-display">How do agents pay?</h3>
            <p className="ak-muted">
              Unpaid calls return 402. Settle Mainnet USDC ASA 31566704 via GoPlausible, retry with proof, store
              X-AgentKeep-Session for free Memory/Budget GETs (15m).
            </p>
          </div>
          <div className="ak-faq-item ak-reveal">
            <h3 className="ak-display">Algorand or Base?</h3>
            <p className="ak-muted">
              Production challenge rail is Algorand Mainnet + GoPlausible. Separate product from AgentCash.
            </p>
          </div>
          <div className="ak-faq-item ak-reveal">
            <h3 className="ak-display">Where is the API?</h3>
            <p className="ak-muted">
              Live API: <a href={API}><code className="ak-mono">{API}</code></a>. Site:{" "}
              <code className="ak-mono">agentkeep.online</code>.
            </p>
          </div>
        </div>
      </section>

      <footer className="ak-footer">
        <div className="ak-footer-brand">
          <Image src="/brand/logo-mark.svg" alt="" width={22} height={22} />
          <span className="ak-display">AgentKeep</span>
          <span className="ak-muted">· Keep going.</span>
        </div>
        <div className="ak-footer-meta ak-mono">
          <a href={API}>API</a>
          <a href={`${API}/.well-known/x402`}>x402</a>
          <a href="/skill">skill</a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
