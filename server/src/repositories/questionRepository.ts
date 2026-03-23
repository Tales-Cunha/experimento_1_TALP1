import { db } from '../db/db';
import { questions, alternatives } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../errors';

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
  }

  async findById(id: string) {
    const q = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!q) {
      throw new NotFoundError(`Question with id ${id} not found`);
    }

    const alts = db.select()
      .from(alternatives)
      .where(eq(alternatives.questionId, id))
      .all();

    return { ...q, alternatives: alts };
  }

  async create(data: QuestionData) {
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
  }

  async update(id: string, data: QuestionData) {
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
  }

  async delete(id: string) {
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
  }
}
