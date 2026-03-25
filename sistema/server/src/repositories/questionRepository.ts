import { db } from '../db/db';
import { questions, alternatives } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface AlternativeData {
  description: string;
  isCorrect: boolean;
}

export interface QuestionData {
  statement: string;
  alternatives: AlternativeData[];
}

export class QuestionRepository {
  async findAll() {
    try {
      const allQuestions = db.select().from(questions).all();
      const result = [];

      for (const q of allQuestions) {
        const alts = db.select()
          .from(alternatives)
          .where(eq(alternatives.questionId, q.id))
          .all();
        result.push({ ...q, alternatives: alts });
      }

      return result;
    } catch (error: unknown) {
      this.handleRepositoryError(error);
    }
  }

  async findById(id: string) {
    try {
      const q = db.select().from(questions).where(eq(questions.id, id)).get();
      if (!q) {
        throw new NotFoundError(`Question with id ${id} not found`);
      }

      const alts = db.select()
        .from(alternatives)
        .where(eq(alternatives.questionId, id))
        .all();

      return { ...q, alternatives: alts };
    } catch (error: unknown) {
      this.handleRepositoryError(error);
    }
  }

  async create(data: QuestionData) {
    try {
      const questionId = uuidv4();

      db.transaction((tx) => {
        tx.insert(questions).values({
          id: questionId,
          statement: data.statement,
          createdAt: new Date().toISOString(),
        }).run();

        for (const alt of data.alternatives) {
          tx.insert(alternatives).values({
            id: uuidv4(),
            questionId,
            description: alt.description,
            isCorrect: alt.isCorrect ? 1 : 0,
          }).run();
        }
      });

      return this.findById(questionId);
    } catch (error: unknown) {
      this.handleRepositoryError(error);
    }
  }

  async update(id: string, data: QuestionData) {
    try {
      // Check if exists
      await this.findById(id);

      db.transaction((tx) => {
        tx.update(questions)
          .set({ statement: data.statement })
          .where(eq(questions.id, id))
          .run();

        tx.delete(alternatives)
          .where(eq(alternatives.questionId, id))
          .run();

        for (const alt of data.alternatives) {
          tx.insert(alternatives).values({
            id: uuidv4(),
            questionId: id,
            description: alt.description,
            isCorrect: alt.isCorrect ? 1 : 0,
          }).run();
        }
      });

      return this.findById(id);
    } catch (error: unknown) {
      this.handleRepositoryError(error);
    }
  }

  async delete(id: string) {
    try {
      // Check if exists
      await this.findById(id);

      db.transaction((tx) => {
        tx.delete(alternatives)
          .where(eq(alternatives.questionId, id))
          .run();
        tx.delete(questions)
          .where(eq(questions.id, id))
          .run();
      });
    } catch (error: unknown) {
      this.handleRepositoryError(error);
    }
  }

  private handleRepositoryError(error: unknown): never {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    if (this.isSqliteConstraintError(error)) {
      throw new ValidationError(this.describeQuestionConstraint(error.message));
    }

    throw new Error('Internal Server Error');
  }

  private isSqliteConstraintError(error: unknown): error is { code: string; message: string } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const sqliteError = error as { code?: unknown; message?: unknown };
    return typeof sqliteError.code === 'string'
      && sqliteError.code.startsWith('SQLITE_CONSTRAINT')
      && typeof sqliteError.message === 'string';
  }

  private describeQuestionConstraint(sqliteMessage: string): string {
    if (sqliteMessage.includes('questions.statement')) {
      return 'Invalid question statement: value is required.';
    }

    if (sqliteMessage.includes('alternatives.description')) {
      return 'Invalid alternative description: value is required.';
    }

    if (sqliteMessage.includes('UNIQUE')) {
      return 'Duplicate question data violates a unique constraint.';
    }

    return 'Invalid question data violates a database constraint.';
  }
}
