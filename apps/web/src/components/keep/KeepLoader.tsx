"use client";

import dynamic from "next/dynamic";

const KeepApp = dynamic(() => import("./KeepApp"), {
  ssr: false,
  loading: () => (
    <p className="ak-mono ak-muted ak-keep-loading">Opening the keep…</p>
  ),
});

export function KeepLoader() {
  return <KeepApp />;
}
