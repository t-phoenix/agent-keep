"use client";

import dynamic from "next/dynamic";

const HeroCanvas = dynamic(() => import("./HeroCanvas").then((m) => m.HeroCanvas), {
  ssr: false,
  loading: () => <div className="ak-canvas-fallback" />,
});

export function HeroScene({ progress = 0 }: { progress?: number }) {
  return <HeroCanvas progress={progress} />;
}
