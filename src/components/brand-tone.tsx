"use client";

import { useLayoutEffect } from "react";

// On full-purple screens, paint the page behind the app (notch, corners,
// desktop sides) and the browser's toolbar purple, then put both back when
// the screen goes away. Next.js keeps visited pages in the DOM but hidden,
// so this must follow the effect lifecycle, not the element being present.
export function BrandTone() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.tone = "brand";
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    if (meta) meta.content = "#5b3ff0";
    return () => {
      delete root.dataset.tone;
      if (meta && previous) meta.content = previous;
    };
  }, []);
  return null;
}
