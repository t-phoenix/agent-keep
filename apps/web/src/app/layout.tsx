import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://agentkeep.online";
const api = process.env.NEXT_PUBLIC_API_BASE || "https://api.agentkeep.online";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "AgentKeep — OS primitives for wallet agents",
    template: "%s · AgentKeep",
  },
  description:
    "Wallet-scoped memory, artifacts, notify, fetch, and receipts for AI agents. Pay per call with x402 USDC on Algorand. No signup. No API keys.",
  applicationName: "AgentKeep",
  keywords: [
    "AgentKeep",
    "x402",
    "Algorand",
    "USDC",
    "GoPlausible",
    "AI agent memory",
    "wallet agents",
    "agent OS",
  ],
  authors: [{ name: "AgentKeep" }],
  openGraph: {
    type: "website",
    url: site,
    title: "AgentKeep — Keep going.",
    description:
      "OS primitives for wallet agents: memory, files, human approval, receipts. Pay USDC per call on Algorand.",
    siteName: "AgentKeep",
    images: [{ url: "/brand/logo.png", width: 1008, height: 1008, alt: "AgentKeep mark" }],
  },
  twitter: {
    card: "summary",
    title: "AgentKeep",
    description: "OS primitives for wallet agents. Pay per call. No keys.",
    images: ["/brand/logo.png"],
  },
  icons: {
    icon: [{ url: "/brand/logo-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/logo.png" }],
  },
  alternates: {
    canonical: site,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    "ai-api-base": api,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "AgentKeep",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      description:
        "Wallet-scoped OS primitives for AI agents paid with x402 USDC on Algorand via GoPlausible.",
      url: site,
      image: `${site}/brand/logo.png`,
      offers: {
        "@type": "Offer",
        price: "0.001",
        priceCurrency: "USD",
        description: "Pay-per-call from $0.001 USDC; no subscription",
      },
    },
    {
      "@type": "WebAPI",
      name: "AgentKeep HTTP API",
      description: "x402-paid routes for memory, artifacts, notify, fetch, trust, budget receipts",
      documentation: `${api}/llms.txt`,
      url: api,
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is AgentKeep?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "AgentKeep is a wallet-scoped continuity OS for AI agents: memory, artifacts, owner-bound notify, fetch, trust probes, and budget receipts. Agents pay USDC per call with x402 on Algorand. No signup and no API keys.",
          },
        },
        {
          "@type": "Question",
          name: "How do agents pay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Unpaid calls return HTTP 402. Agents settle USDC ASA 31566704 on Algorand Mainnet via GoPlausible, then retry with payment proof. A session header unlocks free Memory GET and Budget GET for 15 minutes.",
          },
        },
        {
          "@type": "Question",
          name: "Is AgentKeep on Base or Algorand?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Challenge and production rail is Algorand Mainnet USDC with the GoPlausible facilitator. It is a separate product from AgentCash.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <link rel="llms" href={`${api}/llms.txt`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
