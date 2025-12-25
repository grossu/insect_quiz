export interface InsectObservation {
  id: number;
  place_guess?: string;
  observed_on?: string;
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string;
  };
  photos: Array<{
    id: number;
    url: string;
    attribution: string;
  }>;
}

export interface AnswerOption {
  id: number;
  name: string;
  commonName?: string;
  russianName?: string;
}

export interface QuizQuestion {
  insect: InsectObservation;
  options: AnswerOption[];
  correctAnswerId: number;
}

export interface QuizState {
  currentQuestion: QuizQuestion | null;
  selectedAnswerId: number | null;
  showResult: boolean;
  isCorrect: boolean;
  score: number;
  attempts: number;
  isLoading: boolean;
}

export interface AnswerHistoryEntry {
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  observationId: number;
  timestamp: number;
}
