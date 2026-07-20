"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TribalBackground from "./TribalBackground";
import { AVAILABLE_MODES } from "./modes";
import { decodeEntities, shuffle } from "./questions";
import { TriviaQuestion } from "./types";

/**
 * Tribial "Basic" mode: hold-to-reveal trivia.
 *
 * The long-press mechanic mirrors Songster's ClassicGame: hold ~0.6s to reveal
 * the answer, hold again to advance. The multiple-choice options (correct +
 * incorrect, shuffled) are shown alongside the question; holding highlights the
 * correct one. Category/difficulty are intentionally not shown.
 */
export default function BasicGame({ questions, mode, onExit, onComplete }: {
  questions: TriviaQuestion[];
  mode: string;
  onExit: () => void;
  /** Called when the deck is played to the end (before exiting). */
  onComplete?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealState, setRevealState] = useState<'HIDDEN' | 'REVEALED'>('HIDDEN');
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) return;

    setIsHolding(true);

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);

      if (revealState === 'HIDDEN') {
        setRevealState('REVEALED');
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < questions.length) {
          setRevealState('HIDDEN');
          setCurrentIndex(nextIndex);
        } else {
          onComplete?.();
          onExit();
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
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const q = questions[currentIndex];
  // useMemo must run on every render (Rules of Hooks), so it guards against an
  // empty deck itself rather than relying on the early return below.
  const options = useMemo(
    () => (q ? shuffle([q.correct_answer, ...q.incorrect_answers]) : []),
    [q]
  );

  // Guard against an empty deck (shouldn't happen — Start gates on count > 0).
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#12100E] text-[#F5ECD9]">
        <p className="mb-4 text-[#8A7A63]">No hay preguntas para jugar.</p>
        <button onClick={onExit} className="px-6 py-2 bg-[#241B12] rounded-full text-[#F5ECD9]">Volver</button>
      </div>
    );
  }

  const modeName = AVAILABLE_MODES.find((m) => m.id === mode)?.name || mode;

  return (
    <>
      <div
        className="fixed inset-0 bg-[#12100E] flex flex-col items-center justify-center select-none touch-none overflow-hidden text-[#F5ECD9]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <TribalBackground />

        {/* hold progress bar */}
        <div
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#F2A03D] to-[#E8681A] transition-all ease-linear z-20 shadow-[0_0_12px_rgba(232,104,26,0.7)]"
          style={{
            width: isHolding ? '100%' : '0%',
            transitionDuration: isHolding ? '600ms' : '150ms',
          }}
        />

        {/* counter */}
        <div className="absolute top-4 left-4 z-20 text-[#8A7A63] text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1">
          <span>{currentIndex + 1} / {questions.length}</span>
          <span className="text-xs opacity-70 uppercase">{modeName}</span>
        </div>

        {/* end game */}
        <div className="absolute top-4 right-4 z-20 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onExit(); }}
            className="text-xs px-3 py-1 border border-[#3A2C18] rounded text-[#8A7A63] hover:bg-[#241B12] transition"
          >
            Terminar
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6 text-center pointer-events-none">
          <div
            className={`flex flex-col items-center w-full transition-transform duration-500 ${
              isHolding ? (revealState === 'HIDDEN' ? 'scale-105' : 'scale-95') : 'scale-100'
            }`}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[#F5ECD9] tracking-tight leading-snug mb-8">
              {decodeEntities(q.question)}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
              {options.map((opt, i) => {
                const isCorrect = opt === q.correct_answer;
                const revealed = revealState === 'REVEALED';
                return (
                  <div
                    key={i}
                    className={`px-4 py-3 rounded-lg border text-sm sm:text-base transition-all duration-300 ${
                      revealed && isCorrect
                        ? 'border-[#E8681A] bg-gradient-to-r from-[#F2A03D]/20 via-[#E8681A]/20 to-[#B23A0E]/20 text-[#F5ECD9] font-bold shadow-[0_0_16px_rgba(232,104,26,0.4)]'
                        : 'border-[#3A2C18] bg-[#1B140D]/60 text-[#F5ECD9]/80'
                    }`}
                  >
                    {decodeEntities(opt)}
                  </div>
                );
              })}
            </div>

            <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? 'text-[#F2A03D]' : 'text-[#8A7A63]'}`}>
              {revealState === 'HIDDEN' ? 'Mantén para revelar' : 'Mantén para la siguiente'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
