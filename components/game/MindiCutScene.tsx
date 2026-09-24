"use client";
import { useEffect, useRef, useState } from "react";
import { SeatIndex } from "@/lib/mindiEngine";
import { TABLE_THEME_STYLES } from "./GameArena";
import type { CutAnimationOptions } from "./mindiCutAnimation";

interface Props extends CutAnimationOptions {
  skin?: string;
  onReady: () => void;
  onRenderer: (ready: boolean) => void;
}

export function MindiCutScene({ draw, seats, viewer, backs, skin, elapsed, label, onReady, onRenderer }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ elapsed, label, onReady, onRenderer });
  callbacks.current = { elapsed, label, onReady, onRenderer };
  const [ready, setReady] = useState(false);
  const configuration = JSON.stringify({ seats, viewer, backs });
  const theme = TABLE_THEME_STYLES[skin ?? "tt_default"] ?? TABLE_THEME_STYLES.tt_default;
  const base = !skin || skin === "tt_default" ? "#182431" : theme.base;
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, lastStatus: boolean | undefined, cleanup = () => {};
    function status(value: boolean) {
      if (disposed || lastStatus === value) return;
      lastStatus = value;
      setReady(value); callbacks.current.onRenderer(value);
      if (value) callbacks.current.onReady();
    }
    const config = JSON.parse(configuration) as { seats: SeatIndex[]; viewer: SeatIndex; backs: Partial<Record<SeatIndex, string>> };
    import("./mindiCutAnimation").then(async ({ cutAnimation }) => {
      const { mountTable } = await import("./mindiTableRenderer");
      if (disposed) return;
      cleanup = mountTable(element, { base, skin: skin ?? "tt_default", accent: theme.glow }, () => status(true), () => status(false),
        cutAnimation({ ...config, draw, elapsed: () => callbacks.current.elapsed(), label: (...args) => callbacks.current.label(...args) }));
    }).catch(() => status(false));
    return () => { disposed = true; cleanup(); };
  }, [draw, configuration, base, skin, theme.glow]);
  return <div ref={host} className="mindi-cut-scene" data-renderer={ready ? "webgl" : "fallback"} data-skin={skin ?? "tt_default"} aria-hidden="true" />;
}
