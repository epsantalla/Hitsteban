"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Multi-line text that auto-shrinks its font size to fit entirely within its
 * container — used for Dende's cards, whose text length varies a lot and must
 * never overflow, get clipped, or break a word mid-way.
 *
 * The text fills the container's width and wraps normally between words. We
 * binary-search for the largest font in [min, max] whose wrapped text fits the
 * container in *both* dimensions:
 *   - height: every line fits vertically (`scrollHeight`);
 *   - width:  the widest single word still fits on one line (`scrollWidth`),
 *             so no word is ever hyphenated or chopped.
 *
 * `min` is only a *preferred* floor: if even `min` overflows, the search
 * continues below it (down to 1px) so text is never clipped, however small it
 * has to get. `max` caps how large short text can grow.
 *
 * The fit only re-runs when the text content or the box size actually changes
 * — not on every parent re-render (e.g. the hold-to-reveal scale toggle) — so
 * advancing cards stays cheap and jank-free.
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
  const fitRef = useRef<() => void>(() => {});
  // The inputs of the last completed search, so redundant re-renders skip it.
  const lastFit = useRef({ text: "", w: 0, h: 0 });

  // Set up the (stable) fit routine + a ResizeObserver once. The routine reads
  // from refs, so it never needs re-creating when `children` change.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Leave a little headroom below the container's true height: text that
    // measures as "just barely fitting" can still visually clip a pixel or two
    // (descenders, sub-pixel rounding in scrollHeight), so aim a bit smaller.
    const SAFETY = 0.92;

    const fits = (size: number) => {
      text.style.fontSize = `${size}px`;
      return (
        text.scrollHeight <= container.clientHeight * SAFETY &&
        // No word may spill past the box width — that's what would force a break.
        text.scrollWidth <= container.clientWidth
      );
    };

    // Largest size in [lo, hi] that still fits, or null if none does.
    const search = (lo: number, hi: number): number | null => {
      let best: number | null = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
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
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      // Skip the (reflow-heavy) search when nothing that affects it changed.
      const content = text.textContent ?? "";
      const prev = lastFit.current;
      if (content === prev.text && w === prev.w && h === prev.h) return;

      // Prefer the [min, max] range; if even `min` overflows, keep shrinking
      // below it (down to 1px) so text is never clipped.
      const best = search(min, max) ?? search(1, min - 1) ?? 1;
      lastFit.current = { text: content, w, h };
      text.style.fontSize = `${best}px`;
      setFontSize(best);
    };

    fitRef.current = fit;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [max, min]);

  // Re-fit when the rendered children change — cheap thanks to the guard above,
  // which only pays for the binary search if the text content really changed.
  useLayoutEffect(() => {
    fitRef.current();
  }, [children]);

  return (
    <div ref={containerRef} className={`w-full h-full overflow-hidden flex items-center justify-center ${className}`}>
      {/* w-full + min-w-0 override the flex item's default max-content sizing —
          without them the text hugs its unwrapped width (one huge line) instead
          of wrapping. Normal wrapping (no `break-words`) keeps every word
          intact; the width check in `fits` shrinks the font until they fit. */}
      <div ref={textRef} className={`w-full min-w-0 text-center ${textClassName}`} style={{ fontSize }}>
        {children}
      </div>
    </div>
  );
}
