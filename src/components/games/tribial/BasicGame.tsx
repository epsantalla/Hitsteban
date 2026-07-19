"use client";

import { useEffect, useRef, useState } from "react";
import TribalBackground from "./TribalBackground";
import { AVAILABLE_MODES } from "./modes";
import { decodeEntities } from "./questions";
import { TriviaQuestion } from "./types";

/**
 * Tribial "Basic" mode: hold-to-reveal trivia.
 *
 * The long-press mechanic mirrors Songster's ClassicGame: hold ~0.6s to reveal
 * the answer, hold again to advance. Only the question and the correct answer
 * are shown — the incorrect answers stay hidden (kept in the data for a future
 * "show options" config).
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

  // Guard against an empty deck (shouldn't happen — Start gates on count > 0).
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#12100E] text-[#F5ECD9]">
        <p className="mb-4 text-[#8A7A63]">No hay preguntas para jugar.</p>
        <button onClick={onExit} className="px-6 py-2 bg-[#241B12] rounded-full text-[#F5ECD9]">Volver</button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const modeName = AVAILABLE_MODES.find((m) => m.id === mode)?.name || mode;

  return (
    <>
      <style>{`
        @keyframes tribial-reveal {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
          {revealState === 'HIDDEN' ? (
            <div className={`flex flex-col items-center w-full transition-transform duration-500 ${isHolding ? 'scale-105' : 'scale-100'}`}>
              <span className="mb-6 px-3 py-1 rounded-full border border-[#3A2C18] bg-[#1B140D]/70 text-[11px] uppercase tracking-widest text-[#E8681A]">
                {decodeEntities(q.category)} · {q.difficulty}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#F5ECD9] tracking-tight leading-snug mb-12">
                {decodeEntities(q.question)}
              </h2>
              <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? 'text-[#F2A03D]' : 'text-[#8A7A63]'}`}>
                Mantén para revelar
              </p>
            </div>
          ) : (
            <div style={{ animation: 'tribial-reveal 320ms ease-out' }} className="flex flex-col items-center w-full">
              <div className={`flex flex-col items-center w-full transition-transform duration-500 ${isHolding ? 'scale-95' : 'scale-100'}`}>
                <span className="mb-4 text-xs uppercase tracking-[0.3em] text-[#8A7A63]">Respuesta</span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-16 bg-clip-text text-transparent bg-gradient-to-r from-[#F2A03D] via-[#F5ECD9] to-[#E8681A]">
                  {decodeEntities(q.correct_answer)}
                </h2>
                <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? 'text-[#F2A03D]' : 'text-[#8A7A63]'}`}>
                  Mantén para la siguiente
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
