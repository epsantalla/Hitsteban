export interface GameMode {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODES: GameMode[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original Hitsteban experience. Guess the track from the start.",
  },
  {
    id: "carousel",
    name: "Carousel",
    description: "Turn-based multiplayer mode with scoring. Players take turns guessing the song.",
  }
];
