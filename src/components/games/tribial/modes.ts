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
];
