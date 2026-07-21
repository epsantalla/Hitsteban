"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_QUESTIONS, decodeEntities, shuffle } from "@/components/games/tribial/questions";
import { TriviaQuestion } from "@/components/games/tribial/types";
import NamekBackground from "./NamekBackground";

/**
 * Dende's `special_tribial` sub-phase: 3 random Tribial questions, played
 * exactly like Tribial's Basic mode (hold to reveal, hold again to advance),
 * but restyled to Dende's Namek theme instead of Tribial's own look.
 */
export default function TribialCards({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [questions] = useState<TriviaQuestion[]>(() => shuffle(ALL_QUESTIONS).slice(0, 3));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealState, setRevealState] = useState<"HIDDEN" | "REVEALED">("HIDDEN");
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) return;

    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);

      if (revealState === "HIDDEN") {
        setRevealState("REVEALED");
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < questions.length) {
          setRevealState("HIDDEN");
          setCurrentIndex(nextIndex);
        } else {
          onDone();
        }
      }
    }, 600);
  };

  const handlePointerUpOrLeave = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const q = questions[currentIndex];
  const options = useMemo(() => (q ? shuffle([q.correct_answer, ...q.incorrect_answers]) : []), [q]);

  // Guard against an empty deck (shouldn't happen — ALL_QUESTIONS always has
  // more than 3 entries). Deferred to an effect since it updates the parent.
  useEffect(() => {
    if (!q) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (!q) return null;

  return (
    <div
      className="fixed inset-0 bg-[#04120D] flex flex-col items-center justify-center select-none touch-none overflow-hidden text-[#EAF7EE]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
      onPointerCancel={handlePointerUpOrLeave}
      style={{ touchAction: "none", userSelect: "none" }}
    >
      <NamekBackground />

      <div
        className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#2BB673] to-[#1B998B] transition-all ease-linear z-20 shadow-[0_0_12px_rgba(43,182,115,0.7)]"
        style={{ width: isHolding ? "100%" : "0%", transitionDuration: isHolding ? "600ms" : "150ms" }}
      />

      <div className="absolute top-4 left-4 z-20 text-[#8FBFA4] text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1">
        <span>{currentIndex + 1} / {questions.length}</span>
        <span className="text-xs opacity-70 uppercase">Trivia namekiana</span>
      </div>

      <div className="absolute top-4 right-4 z-20 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="text-xs px-3 py-1 border border-[#1B4433] rounded text-[#8FBFA4] hover:bg-[#0B2A20] transition"
        >
          Terminar
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6 text-center pointer-events-none">
        <div
          className={`flex flex-col items-center w-full transition-transform duration-500 ${
            isHolding ? (revealState === "HIDDEN" ? "scale-105" : "scale-95") : "scale-100"
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-[#EAF7EE] tracking-tight leading-snug mb-8">
            {decodeEntities(q.question)}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
            {options.map((opt, i) => {
              const isCorrect = opt === q.correct_answer;
              const revealed = revealState === "REVEALED";
              return (
                <div
                  key={i}
                  className={`px-4 py-3 rounded-lg border text-sm sm:text-base transition-all duration-300 ${
                    revealed && isCorrect
                      ? "border-[#2BB673] bg-gradient-to-r from-[#2BB673]/20 via-[#1B998B]/20 to-[#0B2A20]/20 text-[#EAF7EE] font-bold shadow-[0_0_16px_rgba(43,182,115,0.4)]"
                      : "border-[#1B4433] bg-[#0B2A20]/60 text-[#EAF7EE]/80"
                  }`}
                >
                  {decodeEntities(opt)}
                </div>
              );
            })}
          </div>

          <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? "text-[#2BB673]" : "text-[#8FBFA4]"}`}>
            {revealState === "HIDDEN" ? "Mantén para revelar" : "Mantén para la siguiente"}
          </p>
        </div>
      </div>
    </div>
  );
}
