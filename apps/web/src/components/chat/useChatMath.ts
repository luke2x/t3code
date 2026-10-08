import { useEffect, useState } from "react";
import type { LatexRenderingMode } from "@t3tools/contracts/settings";

type MathPlugins = typeof import("./markdownMath").CHAT_MATH_PLUGINS;
type ActiveMathMode = Exclude<LatexRenderingMode, "off">;

const loadedPlugins: Partial<Record<ActiveMathMode, MathPlugins>> = {};
const loadingPlugins: Partial<Record<ActiveMathMode, Promise<MathPlugins>>> = {};

export function loadChatMathPlugins(mode: ActiveMathMode = "on"): Promise<MathPlugins> {
  loadingPlugins[mode] ??= (
    mode === "on" ? import("./markdownMathRendered") : import("./markdownMathReadable")
  )
    .then(({ CHAT_MATH_PLUGINS }) => {
      loadedPlugins[mode] = CHAT_MATH_PLUGINS;
      return CHAT_MATH_PLUGINS;
    })
    .catch((error: unknown) => {
      delete loadingPlugins[mode];
      throw error;
    });
  return loadingPlugins[mode];
}

/** Ordinary messages keep their pipeline. Readable mode does not load typesetting styles or fonts. */
export function useChatMathPlugins(mode: LatexRenderingMode, text: string) {
  const needed =
    mode !== "off" && (text.includes("\\(") || text.includes("\\[") || text.includes("$$"));
  const [loaded, setLoaded] = useState<{ mode: ActiveMathMode; plugins: MathPlugins }>();
  const plugins =
    mode !== "off"
      ? (loadedPlugins[mode] ?? (loaded?.mode === mode ? loaded.plugins : undefined))
      : undefined;
  useEffect(() => {
    if (!needed || plugins) return;
    let cancelled = false;
    void loadChatMathPlugins(mode).then(
      (result) => {
        if (!cancelled) setLoaded({ mode, plugins: result });
      },
      () => {
        // A failed chunk download leaves the original Markdown readable.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode, needed, plugins]);
  return needed ? plugins : undefined;
}
