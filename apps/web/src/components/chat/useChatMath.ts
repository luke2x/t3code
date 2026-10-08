import { useEffect, useState } from "react";

type MathPlugins = typeof import("./markdownMath").CHAT_MATH_PLUGINS;

let loadedPlugins: MathPlugins | undefined;
let loadingPlugins: Promise<MathPlugins> | undefined;

export function loadChatMathPlugins(): Promise<MathPlugins> {
  loadingPlugins ??= import("./markdownMath")
    .then(({ CHAT_MATH_PLUGINS }) => {
      loadedPlugins = CHAT_MATH_PLUGINS;
      return CHAT_MATH_PLUGINS;
    })
    .catch((error: unknown) => {
      loadingPlugins = undefined;
      throw error;
    });
  return loadingPlugins;
}

/** Leave ordinary messages on the existing pipeline; load math and its fonts once, on demand. */
export function useChatMathPlugins(enabled: boolean, text: string) {
  const needed = enabled && (text.includes("\\(") || text.includes("\\[") || text.includes("$$"));
  const [plugins, setPlugins] = useState(loadedPlugins);
  useEffect(() => {
    if (!needed || plugins) return;
    let cancelled = false;
    void loadChatMathPlugins().then(
      (result) => {
        if (!cancelled) setPlugins(result);
      },
      () => {
        // A failed chunk download leaves the original Markdown readable.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [needed, plugins]);
  return needed ? plugins : undefined;
}
