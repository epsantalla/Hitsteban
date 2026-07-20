"use client";

import { useMemo, useState } from "react";
import { Rye } from "next/font/google";
import BasicGame from "./BasicGame";
import ClassicGame from "./ClassicGame";
import TribalBackground from "./TribalBackground";
import { AVAILABLE_MODES } from "./modes";
import { ALL_CATEGORIES, ALL_DIFFICULTIES, ALL_QUESTIONS, decodeEntities, shuffle } from "./questions";
import { TriviaQuestion } from "./types";

const rye = Rye({ subsets: ["latin"], weight: "400" });

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

/**
 * The Tribial game module: a caveman/tribal-themed trivia game. Self-contained.
 * Basic mode is a hold-to-reveal deck of multiple-choice questions: the shuffled
 * options are shown alongside the question, and holding highlights the correct
 * one. A settings panel lets the player restrict which categories/difficulties
 * are included (everything is included by default).
 *
 * `onExit` returns the user to the Estebox main menu.
 */
export default function Tribial({ onExit }: { onExit: () => void }) {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [selectedMode, setSelectedMode] = useState(AVAILABLE_MODES[0].id);
  // The shuffled deck for the current game (frozen at Start, so it stays stable).
  const [deck, setDeck] = useState<TriviaQuestion[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(ALL_CATEGORIES)
  );
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(
    () => new Set(ALL_DIFFICULTIES)
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(difficulty)) next.delete(difficulty);
      else next.add(difficulty);
      return next;
    });
  };

  const filteredQuestions = useMemo(
    () =>
      ALL_QUESTIONS.filter(
        (q) => selectedCategories.has(q.category) && selectedDifficulties.has(q.difficulty)
      ),
    [selectedCategories, selectedDifficulties]
  );

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    // Classic mode manages its own players/difficulty/categories internally, so
    // it starts straight from ALL_QUESTIONS regardless of the deck filters.
    if (selectedMode === "classic") {
      setIsGameStarted(true);
      return;
    }
    if (filteredQuestions.length === 0) return;
    setDeck(shuffle(filteredQuestions));
    setIsGameStarted(true);
  };

  if (isGameStarted) {
    if (selectedMode === "classic") {
      return (
        <ClassicGame questions={ALL_QUESTIONS} onExit={() => setIsGameStarted(false)} />
      );
    }
    return (
      <BasicGame
        questions={deck}
        mode={selectedMode}
        onExit={() => setIsGameStarted(false)}
      />
    );
  }

  const count = filteredQuestions.length;

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

      <div className={`absolute top-4 right-4 z-10 ${selectedMode === "classic" ? "hidden" : ""}`}>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Configurar preguntas"
          className="p-2 border border-[#8A7A63]/60 rounded-md text-[#8A7A63] hover:text-[#F5ECD9] hover:bg-[#241B12] transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-[#1B140D] border border-[#3A2C18] rounded-xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`${rye.className} text-2xl text-[#F2A03D]`}>Configurar</h3>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Cerrar"
                className="text-[#8A7A63] hover:text-[#F5ECD9] text-xl leading-none px-2"
              >
                &times;
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#E8681A]/90 font-medium">Categorías</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategories(
                      selectedCategories.size === ALL_CATEGORIES.length
                        ? new Set()
                        : new Set(ALL_CATEGORIES)
                    )
                  }
                  className="text-xs text-[#8A7A63] hover:text-[#F5ECD9] underline"
                >
                  {selectedCategories.size === ALL_CATEGORIES.length ? "Ninguna" : "Todas"}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {ALL_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-3 text-sm text-[#F5ECD9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 accent-[#E8681A]"
                    />
                    {decodeEntities(category)}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#E8681A]/90 font-medium">Dificultad</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDifficulties(
                      selectedDifficulties.size === ALL_DIFFICULTIES.length
                        ? new Set()
                        : new Set(ALL_DIFFICULTIES)
                    )
                  }
                  className="text-xs text-[#8A7A63] hover:text-[#F5ECD9] underline"
                >
                  {selectedDifficulties.size === ALL_DIFFICULTIES.length ? "Ninguna" : "Todas"}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {ALL_DIFFICULTIES.map((difficulty) => (
                  <label key={difficulty} className="flex items-center gap-3 text-sm text-[#F5ECD9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDifficulties.has(difficulty)}
                      onChange={() => toggleDifficulty(difficulty)}
                      className="w-4 h-4 accent-[#E8681A]"
                    />
                    {DIFFICULTY_LABELS[difficulty] ?? difficulty}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold hover:scale-[1.02] transition-all active:scale-95"
            >
              Listo
            </button>
          </div>
        </div>
      )}

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
            {selectedMode === "classic" ? (
              "Introduce los jugadores en el siguiente paso"
            ) : count > 0 ? (
              <>
                <span className="text-[#F5ECD9] font-bold">{count}</span> preguntas listas
              </>
            ) : (
              "No hay preguntas cargadas todavía."
            )}
          </p>

          <button
            type="submit"
            disabled={selectedMode !== "classic" && count === 0}
            className="w-full py-4 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold text-lg shadow-xl shadow-[#E8681A]/20 hover:shadow-[#E8681A]/40 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            Empezar
          </button>
        </form>
      </div>
    </main>
  );
}
