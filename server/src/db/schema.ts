import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  statement: text('statement').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
});

export const alternatives = sqliteTable('alternatives', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questions.id),
  description: text('description').notNull(),
  isCorrect: integer('is_correct').notNull().default(0)
});

export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  professor: text('professor').notNull(),
  date: text('date').notNull(),
  identificationMode: text('identification_mode').notNull()
});

export const examQuestions = sqliteTable('exam_questions', {
  examId: text('exam_id').notNull().references(() => exams.id),
  questionId: text('question_id').notNull().references(() => questions.id),
  position: integer('position').notNull()
}, (table) => {
  return [
    primaryKey({ columns: [table.examId, table.questionId] })
  ];
});
