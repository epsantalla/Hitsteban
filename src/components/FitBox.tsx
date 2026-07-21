"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Multi-line text that auto-shrinks its font size to fit entirely within its
 * container (both width and height) — used for Dende's cards, whose text
 * length varies a lot and must never overflow or get clipped.
 *
 * Unlike `FitText` (single line, `nowrap`), this wraps normally, so width
 * doesn't scale linearly with font size (line count can jump). It binary
 * searches for the largest size in [min, max] whose rendered box still fits,
 * re-measuring on container resize and text change.
 *
 * `min` is only a *preferred* floor, not a hard one: if the text is so long
 * that even `min` overflows, the search continues below it (down to 1px) so
 * the text is always fully visible, never clipped — however small it has to
 * get.
 */
export default function FitBox({
  children,
  max = 40,
  min = 16,
  className = "",
  textClassName = "",
}: {
  children: React.ReactNode;
  /** Largest font size in px. */
  max?: number;
  /** Smallest font size in px (floor when the text is very long). */
  min?: number;
  className?: string;
  textClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // A margin below the container's real size: text that measures as
    // "just barely fitting" can still visually clip a pixel or two (font
    // metrics/descenders, sub-pixel rounding in scrollHeight/Width), so the
    // fit check targets a deliberately smaller box than the true one.
    const SAFETY = 0.9;

    const fits = (size: number) => {
      text.style.fontSize = `${size}px`;
      return (
        text.scrollHeight <= container.clientHeight * SAFETY &&
        text.scrollWidth <= container.clientWidth * SAFETY
      );
    };

    // Largest size in [lo, hi] that still fits, or null if none does.
    const search = (lo: number, hi: number): number | null => {
      let best: number | null = null;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fits(mid)) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return best;
    };

    const fit = () => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      // Prefer the [min, max] range; if even `min` overflows, keep shrinking
      // below it (down to 1px) so text is never clipped.
      const best = search(min, max) ?? search(1, min - 1) ?? 1;
      text.style.fontSize = `${best}px`;
      setFontSize(best);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <div ref={containerRef} className={`w-full h-full overflow-hidden flex items-center justify-center ${className}`}>
      <div ref={textRef} className={`text-center ${textClassName}`} style={{ fontSize }}>
        {children}
      </div>
    </div>
  );
}
