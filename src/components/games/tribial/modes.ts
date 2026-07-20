export interface GameMode {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODES: GameMode[] = [
  {
    id: "basic",
    name: "Básico",
    description: "Mantén pulsado para revelar la respuesta y pulsa de nuevo para la siguiente pregunta.",
  },
  {
    id: "classic",
    name: "Clásico",
    description: "Trivial de toda la vida: acierta preguntas por turnos y consigue los 6 quesitos para ganar.",
  },
];
