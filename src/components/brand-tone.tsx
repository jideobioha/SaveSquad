"use client";

import { useEffect } from "react";

// On full-purple screens, tint the browser's status/toolbar purple too,
// then put it back when the screen goes away.
export function BrandTone() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const previous = meta.content;
    meta.content = "#5b3ff0";
    return () => {
      meta.content = previous;
    };
  }, []);
  return null;
}
