export interface GameMode {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODES: GameMode[] = [
  {
    id: "classic",
    name: "Clásico",
    description: "La experiencia original, diseñada para jugar con Hitster Bingo",
  },
  {
    id: "carousel",
    name: "Carrusel",
    description: "Modo multijugador por turnos con puntuación. Los jugadores se turnan para adivinar la canción.",
  }
];
