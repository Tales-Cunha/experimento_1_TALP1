export interface AlternativeData {
  id?: string;
  description: string;
  isCorrect: boolean;
}

export interface QuestionData {
  id: string;
  statement: string;
  alternatives: AlternativeData[];
  createdAt?: string;
}

export type IdentificationMode = 'letters' | 'powers-of-2';

export interface ExamData {
  id?: string;
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: IdentificationMode;
  questions?: QuestionData[];
  questionIds?: string[];
}

