import { db } from '../db/db';
import { exams, examQuestions, questions, alternatives } from '../db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface CreateExamDTO {
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: 'letters' | 'powers-of-2';
  questionIds: string[];
}

export interface ExamWithQuestions {
  id: string;
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: string;
  questions: {
    id: string;
    statement: string;
    alternatives: {
      id: string;
      questionId: string;
      description: string;
      isCorrect: number;
    }[];
  }[];
}

export class ExamRepository {
  async findAll(): Promise<ExamWithQuestions[]> {
    const allExams = db.select().from(exams).all();
    const results: ExamWithQuestions[] = [];

    for (const exam of allExams) {
      const linkedQuestionsBase = db
        .select({
          id: questions.id,
          statement: questions.statement,
        })
        .from(examQuestions)
        .innerJoin(questions, eq(examQuestions.questionId, questions.id))
        .where(eq(examQuestions.examId, exam.id))
        .orderBy(asc(examQuestions.position))
        .all();

      const linkedQuestions = linkedQuestionsBase.map((question) => {
        const questionAlternatives = db
          .select()
          .from(alternatives)
          .where(eq(alternatives.questionId, question.id))
          .all();

        return {
          ...question,
          alternatives: questionAlternatives,
        };
      });

      results.push({
        ...exam,
        questions: linkedQuestions,
      });
    }

    return results;
  }

  async findById(id: string): Promise<ExamWithQuestions> {
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) {
      throw new NotFoundError(`Exam with ID ${id} not found`);
    }

    const linkedQuestionsBase = db
      .select({
        id: questions.id,
        statement: questions.statement,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(eq(examQuestions.examId, id))
      .orderBy(asc(examQuestions.position))
      .all();

    const linkedQuestions = linkedQuestionsBase.map((question) => {
      const questionAlternatives = db
        .select()
        .from(alternatives)
        .where(eq(alternatives.questionId, question.id))
        .all();

      return {
        ...question,
        alternatives: questionAlternatives,
      };
    });

    return {
      ...exam,
      questions: linkedQuestions,
    };
  }

  async create(data: CreateExamDTO): Promise<string> {
    if (!data.title || !data.subject || !data.professor || !data.date) {
      throw new ValidationError('All exam fields are required');
    }
    if (!data.questionIds || data.questionIds.length === 0) {
      throw new ValidationError('An exam must have at least one question');
    }

    const examId = uuidv4();

    return db.transaction((tx) => {
      // Check if all questions exist
      const existingQuestions = tx
        .select({ id: questions.id })
        .from(questions)
        .where(inArray(questions.id, data.questionIds))
        .all();

      if (existingQuestions.length !== data.questionIds.length) {
        throw new ValidationError('One or more referenced questions do not exist');
      }

      tx.insert(exams).values({
        id: examId,
        title: data.title,
        subject: data.subject,
        professor: data.professor,
        date: data.date,
        identificationMode: data.identificationMode,
      }).run();

      data.questionIds.forEach((questionId, index) => {
        tx.insert(examQuestions).values({
          examId,
          questionId,
          position: index,
        }).run();
      });

      return examId;
    });
  }

  async update(id: string, data: Partial<CreateExamDTO>): Promise<void> {
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) {
      throw new NotFoundError(`Exam with ID ${id} not found`);
    }

    db.transaction((tx) => {
      if (data.title || data.subject || data.professor || data.date || data.identificationMode) {
        tx.update(exams)
          .set({
            title: data.title,
            subject: data.subject,
            professor: data.professor,
            date: data.date,
            identificationMode: data.identificationMode,
          })
          .where(eq(exams.id, id))
          .run();
      }

      if (data.questionIds) {
        if (data.questionIds.length === 0) {
          throw new ValidationError('An exam must have at least one question');
        }

        // Check if all questions exist
        const existingQuestions = tx
          .select({ id: questions.id })
          .from(questions)
          .where(inArray(questions.id, data.questionIds))
          .all();

        if (existingQuestions.length !== data.questionIds.length) {
          throw new ValidationError('One or more referenced questions do not exist');
        }

        // Replace questions
        tx.delete(examQuestions).where(eq(examQuestions.examId, id)).run();
        
        data.questionIds.forEach((questionId, index) => {
          tx.insert(examQuestions).values({
            examId: id,
            questionId,
            position: index,
          }).run();
        });
      }
    });
  }

  async delete(id: string): Promise<void> {
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) {
      throw new NotFoundError(`Exam with ID ${id} not found`);
    }

    db.transaction((tx) => {
      tx.delete(examQuestions).where(eq(examQuestions.examId, id)).run();
      tx.delete(exams).where(eq(exams.id, id)).run();
    });
  }

  // Helper for tests
  async clearAll(): Promise<void> {
    db.transaction((tx) => {
      tx.delete(examQuestions).run();
      tx.delete(exams).run();
    });
  }
}
