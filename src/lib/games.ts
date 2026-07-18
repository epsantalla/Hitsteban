export interface GameDefinition {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_GAMES: GameDefinition[] = [
  {
    id: "hitster",
    name: "Hitster",
    description: "Guess the song from a Spotify playlist. Classic solo mode or Carousel multiplayer.",
  },
];
