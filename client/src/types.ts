export interface AlternativeData {
  id?: string;
  description: string;
  isCorrect: boolean;
}

export interface QuestionData {
  id?: string;
  statement: string;
  alternatives: AlternativeData[];
  createdAt?: string;
}
