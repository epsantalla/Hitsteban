export interface GameDefinition {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_GAMES: GameDefinition[] = [
  {
    id: "songster",
    name: "Songster",
    description: "Adivina la canción de una playlist de Spotify. Modo clásico para Hitster Bingo o standalone",
  },
  {
    id: "tribial",
    name: "Tribial",
    description: "Juego de preguntas estilo Trivial",
  },
  {
    id: "dende",
    name: "Dende",
    description: "Un juego de beber inspirado por el Piccolo (pero mejor)",
  },
];
