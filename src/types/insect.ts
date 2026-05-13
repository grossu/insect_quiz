export interface InsectPhoto {
  id: number;
  url: string;
  attribution: string;
  license_code?: string;
  original_dimensions?: {
    width: number;
    height: number;
  };
}

export interface InsectObservation {
  id: number;
  place_guess?: string;
  observed_on?: string;
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string;
  };
  photos: InsectPhoto[];
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

export interface Country {
  id: number;
  name: string;
  nameRu: string;
}

export interface Taxon {
  id: string;
  latinName: string;
  russianName: string;
}

export interface InatTaxonPhoto {
  id: number;
  url: string;
  attribution: string;
  license_code?: string;
}

export interface InatSpeciesCountTaxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  default_photo?: InatTaxonPhoto;
  ancestor_ids?: number[];
}

export interface InatSpeciesCountResult {
  count: number;
  taxon: InatSpeciesCountTaxon;
}

export interface ChecklistSpecies {
  taxonId: number;
  latinName: string;
  russianName?: string;
  photoUrl?: string;
  regionalCount: number;
  found: boolean;
  foundConfirmed?: boolean;
  familyTaxonId?: number;
}

export interface ChecklistFamilyGroup {
  id: string;
  labelRu: string;
  taxonIds: number[];
}

export interface ChecklistRegion {
  id: string;
  labelRu: string;
  placeIds: number[];
}

export interface ChecklistCacheEntry {
  timestamp: number;
  allSpecies: InatSpeciesCountResult[];
  userSpecies: InatSpeciesCountResult[];
  userResearchSpecies: InatSpeciesCountResult[];
}
