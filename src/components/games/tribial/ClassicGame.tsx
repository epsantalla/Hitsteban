"use client";

import { useMemo, useRef, useState } from "react";
import { Rye } from "next/font/google";
import { Plus, X, Trophy, PartyPopper } from "lucide-react";
import TribalBackground from "./TribalBackground";
import { ALL_CATEGORIES, ALL_DIFFICULTIES, decodeEntities, shuffle } from "./questions";
import { TriviaQuestion } from "./types";
import FitText from "@/components/FitText";

const rye = Rye({ subsets: ["latin"], weight: "400" });

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

/**
 * Traditional Trivial Pursuit colors per category. Keyed by the exact Spanish
 * category strings baked into `questions.json`; unknown categories fall back to
 * a stable palette assigned by their sorted position (`ALL_CATEGORIES` is
 * sorted), so the six wedges are always distinctly colored.
 */
const CATEGORY_COLORS: Record<string, string> = {
  "Geografía": "#3B82F6",
  "Entretenimiento": "#EC4899",
  "Historia": "#EAB308",
  "Arte y Literatura": "#A855F7",
  "Ciencia y Naturaleza": "#22C55E",
  "Deportes y Ocio": "#F97316",
};
const FALLBACK_COLORS = ["#3B82F6", "#EC4899", "#EAB308", "#A855F7", "#22C55E", "#F97316"];

interface CategoryMeta {
  cat: string;
  color: string;
}

interface ClassicPlayer {
  id: string;
  name: string;
  /** Category strings the player has won a wedge for. */
  wedges: string[];
}

type Phase = "setup" | "question" | "feedback" | "roundboard" | "win";

/**
 * Tribial "Clásico" mode: turn-based Trivial Pursuit.
 *
 * Players are entered up front (like Songster's Carousel) and the allowed
 * difficulties are configured (all on by default). Starting from a random
 * player, each turn shows a question from a random category; the active player
 * taps an option and holds to confirm. A correct answer wins that category's
 * wedge (if not already owned) and the player keeps playing; a wrong answer
 * passes the turn. First to all six wedges wins. After every full round (one
 * turn each) the players' wedges are shown.
 */
export default function ClassicGame({ questions, onExit }: {
  questions: TriviaQuestion[];
  onExit: () => void;
}) {
  const categories: CategoryMeta[] = useMemo(
    () =>
      ALL_CATEGORIES.map((cat, i) => ({
        cat,
        color: CATEGORY_COLORS[cat] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      })),
    []
  );

  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const [players, setPlayers] = useState<ClassicPlayer[]>([
    { id: "1", name: "", wedges: [] },
    { id: "2", name: "", wedges: [] },
  ]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(
    () => new Set(ALL_DIFFICULTIES)
  );

  // Turn state
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [turnsCompletedThisRound, setTurnsCompletedThisRound] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<CategoryMeta | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Questions already served, tracked by identity so we don't repeat within a game.
  const usedRef = useRef<Set<TriviaQuestion>>(new Set());

  // Feedback state
  const [wasCorrect, setWasCorrect] = useState(false);
  const [wedgeEarned, setWedgeEarned] = useState(false);
  const [winner, setWinner] = useState<ClassicPlayer | null>(null);

  // Hold-to-confirm
  const [isHoldingConfirm, setIsHoldingConfirm] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activePlayer = players[activePlayerIndex];

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(difficulty)) next.delete(difficulty);
      else next.add(difficulty);
      return next;
    });
  };

  /** Pick a random category with an unused question at an allowed difficulty. */
  const startQuestion = () => {
    const pools = categories.map((c) =>
      questions.filter(
        (q) =>
          q.category === c.cat &&
          selectedDifficulties.has(q.difficulty) &&
          !usedRef.current.has(q)
      )
    );
    let available = categories.filter((_, i) => pools[i].length > 0);
    let poolFor = (cat: string) => pools[categories.findIndex((c) => c.cat === cat)];

    // Every allowed question has been served — recycle the whole set.
    if (available.length === 0) {
      usedRef.current = new Set();
      const fresh = categories.map((c) =>
        questions.filter((q) => q.category === c.cat && selectedDifficulties.has(q.difficulty))
      );
      available = categories.filter((_, i) => fresh[i].length > 0);
      poolFor = (cat: string) => fresh[categories.findIndex((c) => c.cat === cat)];
    }

    if (available.length === 0) return; // no questions at all (guarded at Start)

    const cat = available[Math.floor(Math.random() * available.length)];
    const pool = poolFor(cat.cat);
    const q = pool[Math.floor(Math.random() * pool.length)];
    usedRef.current.add(q);

    setCurrentCategory(cat);
    setCurrentQuestion(q);
    setCurrentOptions(shuffle([q.correct_answer, ...q.incorrect_answers]));
    setSelectedOption(null);
    setPhase("question");
  };

  const handleStart = () => {
    if (selectedDifficulties.size === 0) return;
    const finalPlayers = players.map((p, i) => ({
      ...p,
      name: p.name.trim() === "" ? `Jugador ${i + 1}` : p.name.trim(),
      wedges: [],
    }));
    if (finalPlayers.length < 2) return;
    setPlayers(finalPlayers);
    usedRef.current = new Set();
    setActivePlayerIndex(Math.floor(Math.random() * finalPlayers.length));
    setTurnsCompletedThisRound(0);
    setWinner(null);
    // startQuestion reads `players` for nothing category-related, so it's safe
    // even though setPlayers hasn't flushed; it only needs the questions/diffs.
    startQuestion();
  };

  const confirmAnswer = () => {
    if (!currentQuestion || !currentCategory || selectedOption === null) return;
    const correct = selectedOption === currentQuestion.correct_answer;
    setWasCorrect(correct);

    let earned = false;
    if (correct && !activePlayer.wedges.includes(currentCategory.cat)) {
      earned = true;
      const updated = players.map((p, i) =>
        i === activePlayerIndex ? { ...p, wedges: [...p.wedges, currentCategory.cat] } : p
      );
      setPlayers(updated);
      if (updated[activePlayerIndex].wedges.length === categories.length) {
        setWinner(updated[activePlayerIndex]);
      }
    }
    setWedgeEarned(earned);
    setPhase("feedback");
  };

  /** Advance from the feedback screen based on the result. */
  const proceed = () => {
    if (winner) {
      setPhase("win");
      return;
    }
    if (wasCorrect) {
      // Same player keeps their turn.
      startQuestion();
      return;
    }
    // Wrong answer: pass the turn to the next player.
    const len = players.length;
    setActivePlayerIndex((activePlayerIndex + 1) % len);
    const completed = turnsCompletedThisRound + 1;
    if (completed >= len) {
      setTurnsCompletedThisRound(0);
      setPhase("roundboard");
    } else {
      setTurnsCompletedThisRound(completed);
      startQuestion();
    }
  };

  const continueFromRoundboard = () => {
    // activePlayerIndex was already advanced when the round closed.
    startQuestion();
  };

  const playAgain = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, wedges: [] })));
    usedRef.current = new Set();
    setActivePlayerIndex(Math.floor(Math.random() * players.length));
    setTurnsCompletedThisRound(0);
    setWinner(null);
    setPhase("setup");
  };

  // Hold-to-confirm handlers
  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    if (selectedOption === null || holdTimerRef.current) return;
    setIsHoldingConfirm(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHoldingConfirm(false);
      confirmAnswer();
    }, 300);
  };
  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHoldingConfirm(false);
  };

  // --- RENDER ---

  if (phase === "setup") {
    const canStart = players.length >= 2 && selectedDifficulties.size > 0;
    return (
      <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center bg-[#12100E] text-[#F5ECD9] w-full">
        <TribalBackground />
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onExit}
            className="text-sm px-4 py-2 border border-[#8A7A63]/60 rounded-md text-[#8A7A63] hover:text-[#F5ECD9] hover:bg-[#241B12] transition"
          >
            &larr; Menú
          </button>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center px-6 pt-16 pb-24 overflow-y-auto">
          <h2 className={`${rye.className} text-4xl text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E]`}>
            Clásico
          </h2>
          <p className="text-sm text-[#8A7A63] mb-8 text-center">
            Introduce los jugadores en orden. Mínimo 2, máximo 12.
          </p>

          <div className="w-full flex flex-col gap-3 mb-8">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-[#8A7A63] font-mono w-6">{i + 1}.</span>
                <input
                  value={p.name}
                  onChange={(e) => {
                    const newP = [...players];
                    newP[i] = { ...newP[i], name: e.target.value };
                    setPlayers(newP);
                  }}
                  placeholder={`Jugador ${i + 1}`}
                  className="flex-1 bg-[#1B140D] border border-[#3A2C18] rounded-lg px-3 py-3 text-[#F5ECD9] focus:ring-1 focus:ring-[#E8681A] outline-none"
                />
                {players.length > 2 && (
                  <button
                    onClick={() => setPlayers(players.filter((pl) => pl.id !== p.id))}
                    className="p-3 text-[#8A7A63] hover:text-[#B23A0E]"
                    aria-label="Quitar jugador"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
            {players.length < 12 && (
              <button
                onClick={() =>
                  setPlayers([...players, { id: Date.now().toString(), name: "", wedges: [] }])
                }
                className="flex items-center justify-center gap-2 py-3 mt-1 border border-dashed border-[#3A2C18] rounded-lg text-[#8A7A63] hover:text-[#E8681A] hover:border-[#E8681A] transition"
              >
                <Plus size={18} /> Añadir jugador
              </button>
            )}
          </div>

          <div className="w-full mb-8">
            <span className="text-sm text-[#E8681A]/90 font-medium block mb-3">Dificultad</span>
            <div className="flex gap-2">
              {ALL_DIFFICULTIES.map((difficulty) => {
                const active = selectedDifficulties.has(difficulty);
                return (
                  <button
                    key={difficulty}
                    onClick={() => toggleDifficulty(difficulty)}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition ${
                      active
                        ? "border-[#E8681A] bg-[#E8681A]/15 text-[#F5ECD9]"
                        : "border-[#3A2C18] bg-[#1B140D] text-[#8A7A63]"
                    }`}
                  >
                    {DIFFICULTY_LABELS[difficulty] ?? difficulty}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-4 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold text-lg shadow-xl shadow-[#E8681A]/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            Empezar
          </button>
        </div>
      </main>
    );
  }

  if (phase === "win" && winner) {
    return (
      <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center justify-center bg-[#12100E] text-[#F5ECD9] w-full px-6">
        <TribalBackground />
        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md">
          <PartyPopper className="w-20 h-20 text-[#F2A03D] mb-4 drop-shadow-[0_0_18px_rgba(242,160,61,0.5)]" />
          <p className="text-sm uppercase tracking-widest text-[#8A7A63] mb-3">Ganador</p>
          <FitText
            max={72}
            min={28}
            className="mb-6"
            textClassName={`${rye.className} bg-clip-text text-transparent bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] drop-shadow-lg`}
          >
            {winner.name}
          </FitText>
          <WedgeWheel owned={new Set(winner.wedges)} categories={categories} size={120} />
          <p className="text-[#8A7A63] mt-6 mb-8">¡Ha conseguido los 6 quesitos!</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={playAgain}
              className="flex-1 py-3 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold hover:scale-[1.02] transition-all active:scale-95"
            >
              Jugar otra vez
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-3 border border-[#3A2C18] rounded-xl text-[#8A7A63] hover:text-[#F5ECD9] hover:bg-[#241B12] transition"
            >
              Salir
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "roundboard") {
    return (
      <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center bg-[#12100E] text-[#F5ECD9] w-full">
        <TribalBackground />
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center px-6 pt-14 pb-6 h-full">
          <Trophy className="w-14 h-14 text-[#E8681A] mb-3 flex-shrink-0 drop-shadow-[0_0_14px_rgba(232,104,26,0.5)]" />
          <h2 className={`${rye.className} text-3xl text-[#F2A03D] mb-6 flex-shrink-0`}>Fin de ronda</h2>

          <div className="w-full flex-1 overflow-y-auto flex flex-col gap-3 mb-4 min-h-0">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#1B140D] border border-[#3A2C18]"
              >
                <WedgeWheel owned={new Set(p.wedges)} categories={categories} size={52} />
                <span className="flex-1 text-[#F5ECD9] text-lg font-medium truncate">{p.name}</span>
                <span className="text-[#E8681A] font-bold text-xl flex-shrink-0">
                  {p.wedges.length}
                  <span className="text-sm text-[#8A7A63]">/6</span>
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={continueFromRoundboard}
            className="w-full flex-shrink-0 py-4 bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] text-black rounded-xl font-bold text-lg hover:scale-[1.02] transition-all active:scale-95"
          >
            Continuar
          </button>
        </div>
      </main>
    );
  }

  // phase === "question" | "feedback"
  if (!currentQuestion || !currentCategory) return null;
  const revealed = phase === "feedback";

  return (
    <div
      className="fixed inset-0 bg-[#12100E] flex flex-col items-center select-none overflow-hidden text-[#F5ECD9]"
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
    >
      <TribalBackground />

      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={onExit}
          className="text-xs px-3 py-1 border border-[#3A2C18] rounded text-[#8A7A63] hover:bg-[#241B12] transition"
        >
          Terminar
        </button>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col h-full px-6 pt-10 pb-6">
        {/* Active player name — always at the top, auto-fit to the screen width. */}
        <div className="flex-shrink-0 mb-4">
          <p className="text-xs uppercase tracking-widest text-[#8A7A63] text-center mb-1">
            Turno de
          </p>
          <FitText
            max={56}
            min={24}
            textClassName={`${rye.className} bg-clip-text text-transparent bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] drop-shadow-[0_2px_8px_rgba(232,104,26,0.35)]`}
          >
            {activePlayer.name}
          </FitText>
          <div className="mt-2 flex justify-center">
            <WedgeWheel owned={new Set(activePlayer.wedges)} categories={categories} size={40} />
          </div>
        </div>

        {/* Category badge */}
        <div className="flex-shrink-0 flex justify-center mb-4">
          <span
            className="px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
            style={{ backgroundColor: currentCategory.color, color: "#12100E" }}
          >
            {decodeEntities(currentCategory.cat)}
          </span>
        </div>

        {/* Question + options */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center w-full">
          <h2 className="text-xl md:text-2xl font-bold text-[#F5ECD9] tracking-tight leading-snug mb-6 text-center">
            {decodeEntities(currentQuestion.question)}
          </h2>

          <div className="grid grid-cols-1 gap-3 w-full">
            {currentOptions.map((opt, i) => {
              const isCorrect = opt === currentQuestion.correct_answer;
              const isSelected = opt === selectedOption;
              let cls =
                "border-[#3A2C18] bg-[#1B140D]/70 text-[#F5ECD9]/85 hover:border-[#8A7A63]";
              if (revealed) {
                if (isCorrect)
                  cls =
                    "border-[#22C55E] bg-[#22C55E]/15 text-[#F5ECD9] font-bold shadow-[0_0_16px_rgba(34,197,94,0.35)]";
                else if (isSelected)
                  cls = "border-[#B23A0E] bg-[#B23A0E]/15 text-[#F5ECD9]/80";
                else cls = "border-[#3A2C18] bg-[#1B140D]/50 text-[#F5ECD9]/50";
              } else if (isSelected) {
                cls =
                  "border-[#E8681A] bg-[#E8681A]/15 text-[#F5ECD9] font-bold shadow-[0_0_16px_rgba(232,104,26,0.35)]";
              }
              return (
                <button
                  key={i}
                  disabled={revealed}
                  onClick={() => setSelectedOption(opt)}
                  className={`px-4 py-3 rounded-lg border text-left text-sm sm:text-base transition-all duration-200 ${cls}`}
                >
                  {decodeEntities(opt)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom action */}
        <div className="flex-shrink-0 mt-4 mb-6">
          {!revealed ? (
            <button
              onPointerDown={startHold}
              disabled={selectedOption === null}
              className="relative w-full py-5 rounded-xl overflow-hidden bg-gradient-to-r from-[#F2A03D] via-[#E8681A] to-[#B23A0E] active:scale-95 transition-transform disabled:opacity-40 disabled:from-[#3A2C18] disabled:via-[#3A2C18] disabled:to-[#3A2C18]"
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all ease-linear"
                style={{
                  width: isHoldingConfirm ? "100%" : "0%",
                  transitionDuration: isHoldingConfirm ? "100ms" : "50ms",
                }}
              />
              <span className="relative z-10 font-bold text-lg uppercase tracking-widest text-black">
                {selectedOption === null ? "Elige una respuesta" : "Mantén para confirmar"}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p
                className={`text-center font-bold text-lg ${
                  wasCorrect ? "text-[#22C55E]" : "text-[#B23A0E]"
                }`}
              >
                {wasCorrect
                  ? wedgeEarned
                    ? `¡Correcto! Ganas el quesito de ${decodeEntities(currentCategory.cat)}`
                    : "¡Correcto! Sigues jugando"
                  : "Fallo. Pasa el turno"}
              </p>
              <button
                onClick={proceed}
                className="w-full py-4 bg-[#241B12] border border-[#3A2C18] rounded-xl font-bold text-lg text-[#F5ECD9] hover:bg-[#2E2318] active:scale-95 transition"
              >
                {winner ? "Ver ganador" : wasCorrect ? "Siguiente pregunta" : "Siguiente jugador"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A six-sector "quesitos" wheel token: each sector is filled with its category
 * color when owned, and left faint otherwise.
 */
function WedgeWheel({
  owned,
  categories,
  size = 64,
}: {
  owned: Set<string>;
  categories: CategoryMeta[];
  size?: number;
}) {
  const cx = 50;
  const cy = 50;
  const r = 46;
  const step = 360 / categories.length;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="flex-shrink-0">
      {categories.map((c, i) => {
        const a0 = ((i * step - 90) * Math.PI) / 180;
        const a1 = (((i + 1) * step - 90) * Math.PI) / 180;
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const large = step > 180 ? 1 : 0;
        const has = owned.has(c.cat);
        return (
          <path
            key={c.cat}
            d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`}
            fill={has ? c.color : "#241B12"}
            stroke="#12100E"
            strokeWidth="1.5"
            opacity={has ? 1 : 0.55}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="9" fill="#12100E" stroke="#3A2C18" strokeWidth="1.5" />
    </svg>
  );
}
