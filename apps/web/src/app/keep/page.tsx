import type { Metadata } from "next";
import { KeepLoader } from "../../components/keep/KeepLoader";

export const metadata: Metadata = {
  title: "Try",
  description:
    "Connect an Algorand wallet, pay USDC to store a value, and read it back while the 15-minute session is live.",
};

export default function KeepPage() {
  return <KeepLoader />;
}
