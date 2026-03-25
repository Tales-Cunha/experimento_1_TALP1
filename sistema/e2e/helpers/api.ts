import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export type AlternativeInput = {
  description: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  statement: string;
  alternatives: AlternativeInput[];
};

export type Exam = {
  id: string;
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: 'letters' | 'powers-of-2';
  questionIds: string[];
};

export async function createQuestion(
  statement: string,
  alternatives: AlternativeInput[],
): Promise<Question> {
  const response = await api.post<{ id: string }>('/api/questions', {
    statement,
    alternatives,
  });

  const questionResponse = await api.get<Question>(`/api/questions/${response.data.id}`);
  return questionResponse.data;
}

export async function createExam(data: Omit<Exam, 'id'>): Promise<Exam> {
  const response = await api.post<{ id: string }>('/api/exams', data);
  return {
    id: response.data.id,
    ...data,
  };
}

export async function resetDatabase(): Promise<void> {
  await api.delete('/api/test/reset');
}
