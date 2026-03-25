import { ValidationError } from '../errors';
import { QuestionRepository, QuestionData } from '../repositories/questionRepository';

interface RawAlternative {
  description?: unknown;
  isCorrect?: unknown;
}

interface RawQuestionPayload {
  statement?: unknown;
  alternatives?: unknown;
}

export class QuestionService {
  constructor(private readonly questionRepository: QuestionRepository = new QuestionRepository()) {}

  async findAll() {
    return this.questionRepository.findAll();
  }

  async findById(id: string) {
    return this.questionRepository.findById(id);
  }

  async create(rawPayload: unknown) {
    const payload = this.validateAndNormalize(rawPayload);
    return this.questionRepository.create(payload);
  }

  async update(id: string, rawPayload: unknown) {
    const payload = this.validateAndNormalize(rawPayload);
    return this.questionRepository.update(id, payload);
  }

  async delete(id: string) {
    return this.questionRepository.delete(id);
  }

  private validateAndNormalize(rawPayload: unknown): QuestionData {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new ValidationError('Question payload is required');
    }

    const payload = rawPayload as RawQuestionPayload;

    if (typeof payload.statement !== 'string' || payload.statement.trim() === '') {
      throw new ValidationError('Statement is required.');
    }

    if (!Array.isArray(payload.alternatives) || payload.alternatives.length < 2) {
      throw new ValidationError('At least two alternatives are required.');
    }

    const alternatives = payload.alternatives.map((rawAlternative) => {
      const alternative = rawAlternative as RawAlternative;
      if (typeof alternative.description !== 'string' || alternative.description.trim() === '') {
        throw new ValidationError('Alternative description is required.');
      }

      const isCorrect = alternative.isCorrect === true || alternative.isCorrect === 1;

      return {
        description: alternative.description.trim(),
        isCorrect,
      };
    });

    const hasCorrect = alternatives.some((alternative) => alternative.isCorrect);
    if (!hasCorrect) {
      throw new ValidationError('At least one alternative must be marked as correct.');
    }

    return {
      statement: payload.statement.trim(),
      alternatives,
    };
  }
}