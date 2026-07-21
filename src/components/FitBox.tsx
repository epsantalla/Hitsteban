"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Multi-line text that auto-shrinks its font size to fit entirely within its
 * container — used for Dende's cards, whose text length varies a lot and must
 * never overflow or get clipped.
 *
 * The text fills the container's width and wraps normally, so *width* is never
 * the binding constraint (a full-width block can't overflow horizontally, and
 * `break-words` handles the rare too-long word). Only *height* matters: we
 * binary-search for the largest font in [min, max] whose wrapped text still
 * fits the container's height, re-measuring on resize and text change.
 *
 * `min` is only a *preferred* floor: if even `min` overflows, the search
 * continues below it (down to 1px) so text is never clipped, however small it
 * has to get. `max` caps how large short text can grow.
 */
export default function FitBox({
  children,
  max = 64,
  min = 18,
  className = "",
  textClassName = "",
}: {
  children: React.ReactNode;
  /** Largest font size in px. */
  max?: number;
  /** Smallest *preferred* font size in px (the search dips below it if needed). */
  min?: number;
  className?: string;
  textClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(min);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Leave a little headroom below the container's true height: text that
    // measures as "just barely fitting" can still visually clip a pixel or two
    // (descenders, sub-pixel rounding in scrollHeight), so aim a bit smaller.
    const SAFETY = 0.92;

    // The text is full-width and wraps, so only vertical overflow can happen.
    const fitsHeight = (size: number) => {
      text.style.fontSize = `${size}px`;
      return text.scrollHeight <= container.clientHeight * SAFETY;
    };

    // Largest size in [lo, hi] that still fits, or null if none does.
    const search = (lo: number, hi: number): number | null => {
      let best: number | null = null;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fitsHeight(mid)) {
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
      {/* w-full + min-w-0 override the flex item's default max-content sizing —
          without them the text hugs its unwrapped width (one huge line) instead
          of wrapping. `break-words` stops a single long token from overflowing. */}
      <div ref={textRef} className={`w-full min-w-0 break-words text-center ${textClassName}`} style={{ fontSize }}>
        {children}
      </div>
    </div>
  );
}
