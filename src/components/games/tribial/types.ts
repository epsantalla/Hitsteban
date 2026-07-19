/**
 * A single trivia question, in OpenTDB's native shape.
 *
 * Tribial keeps only multiple-choice questions (`type: "multiple"`), but the
 * full record — including `incorrect_answers` — is stored so a later mode/config
 * can display the multiple-choice options while playing. Basic mode only uses
 * `question` and `correct_answer`.
 */
export interface TriviaQuestion {
  type: "multiple";
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

/** The on-disk shape of `questions.json` (mirrors OpenTDB's response). */
export interface QuestionFile {
  results: TriviaQuestion[];
}
