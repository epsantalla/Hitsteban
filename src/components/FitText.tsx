"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * A single line of text that auto-shrinks its font size to fit the available
 * width — used for the "current player" name header, which can be long and must
 * stay on one line without truncating (especially on narrow mobile screens).
 *
 * It measures the text's natural width at `max` and, since width scales linearly
 * with font size, computes the largest size that fits in one pass (re-measured
 * on container resize via ResizeObserver). Styling for the text itself goes on
 * `textClassName` (font, color, gradient); `className` styles the block wrapper
 * (margins, alignment context).
 */
export default function FitText({
  children,
  max = 72,
  min = 24,
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
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const fit = () => {
      const available = container.clientWidth;
      if (available === 0) return;
      // Measure natural width at the max size, then scale down proportionally.
      text.style.fontSize = `${max}px`;
      const needed = text.scrollWidth;
      if (needed === 0) return;
      const next =
        needed <= available
          ? max
          : Math.max(min, Math.floor((max * available) / needed));
      text.style.fontSize = `${next}px`;
      setFontSize(next);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <div ref={containerRef} className={`w-full overflow-hidden text-center ${className}`}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${textClassName}`}
        style={{ fontSize }}
      >
        {children}
      </span>
    </div>
  );
}
