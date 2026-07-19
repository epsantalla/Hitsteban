"use client";

import { useState } from "react";
import { Rye } from "next/font/google";
import BasicGame from "./BasicGame";
import TribalBackground from "./TribalBackground";
import { AVAILABLE_MODES } from "./modes";
import { ALL_QUESTIONS, shuffle } from "./questions";
import { TriviaQuestion } from "./types";

const rye = Rye({ subsets: ["latin"], weight: "400" });

/**
 * The Tribial game module: a caveman/tribal-themed trivia game. Self-contained.
 * Basic mode is a hold-to-reveal deck of multiple-choice questions (the options
 * are hidden for now — only the correct answer is revealed).
 *
 * `onExit` returns the user to the Estebox main menu.
 */
export default function Tribial({ onExit }: { onExit: () => void }) {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [selectedMode, setSelectedMode] = useState(AVAILABLE_MODES[0].id);
  // The shuffled deck for the current game (frozen at Start, so it stays stable).
  const [deck, setDeck] = useState<TriviaQuestion[]>([]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (ALL_QUESTIONS.length === 0) return;
    setDeck(shuffle(ALL_QUESTIONS));
    setIsGameStarted(true);
  };

  if (isGameStarted) {
    return (
      <BasicGame
        questions={deck}
        mode={selectedMode}
        onExit={() => setIsGameStarted(false)}
      />
    );
  }

  const count = ALL_QUESTIONS.length;

  return (
    <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center justify-center p-6 bg-[#12100E] text-[#F5ECD9] w-full">
      <TribalBackground />

      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onExit}
          className="text-sm px-4 py-2 border border-[#8A7A63]/60 rounded-md text-[#8A7A63] hover:text-[#F5ECD9] hover:bg-[#241B12] transition"
        >
          &larr; Menú
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        <h1
          className={`${rye.className} text-6xl font-black mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] drop-shadow-[0_2px_8px_rgba(232,104,26,0.35)]`}
        >
          Tribial
        </h1>
        <p className="text-[#8A7A63] mb-10 text-center text-sm tracking-wide uppercase">
          Trivia de la tribu · mantén pulsado para revelar
        </p>

        <form onSubmit={handleStart} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="mode" className="text-sm text-[#E8681A]/90 font-medium">
              Modo de juego
            </label>
            <div className="relative">
              <select
                id="mode"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-4 py-4 bg-[#1B140D] border border-[#3A2C18] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8681A] text-[#F5ECD9] shadow-inner appearance-none cursor-pointer"
              >
                {AVAILABLE_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-[#8A7A63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            <p className="text-xs text-[#8A7A63] mt-1">
              {AVAILABLE_MODES.find((m) => m.id === selectedMode)?.description}
            </p>
          </div>

          <p className="text-center text-sm text-[#8A7A63]">
            {count > 0 ? (
              <>
                <span className="text-[#F5ECD9] font-bold">{count}</span> preguntas listas
              </>
            ) : (
              "No hay preguntas cargadas todavía."
            )}
          </p>

          <button
            type="submit"
            disabled={count === 0}
            className="w-full py-4 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold text-lg shadow-xl shadow-[#E8681A]/20 hover:shadow-[#E8681A]/40 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            Empezar
          </button>
        </form>
      </div>
    </main>
  );
}
