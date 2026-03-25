import { ValidationError } from '../errors';
import { CreateExamDTO, ExamRepository } from '../repositories/examRepository';

interface RawExamPayload {
  title?: unknown;
  subject?: unknown;
  professor?: unknown;
  date?: unknown;
  identificationMode?: unknown;
  questionIds?: unknown;
}

type IdentificationMode = CreateExamDTO['identificationMode'];

export class ExamService {
  constructor(private readonly examRepository: ExamRepository = new ExamRepository()) {}

  async findAll() {
    return this.examRepository.findAll();
  }

  async findById(id: string) {
    return this.examRepository.findById(id);
  }

  async create(rawPayload: unknown) {
    const payload = this.validateAndNormalize(rawPayload);
    const id = await this.examRepository.create(payload);
    return { id };
  }

  async update(id: string, rawPayload: unknown) {
    const payload = this.validateAndNormalize(rawPayload);
    await this.examRepository.update(id, payload);
    return { message: 'Exam updated successfully' };
  }

  async delete(id: string) {
    await this.examRepository.delete(id);
  }

  async clearAll() {
    await this.examRepository.clearAll();
  }

  private validateAndNormalize(rawPayload: unknown): CreateExamDTO {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new ValidationError('Exam payload is required');
    }

    const payload = rawPayload as RawExamPayload;
    const title = this.requireText(payload.title, 'title');
    const subject = this.requireText(payload.subject, 'subject');
    const professor = this.requireText(payload.professor, 'professor');
    const date = this.requireText(payload.date, 'date');
    const identificationMode = this.validateIdentificationMode(payload.identificationMode);
    const questionIds = this.validateQuestionIds(payload.questionIds);

    return {
      title,
      subject,
      professor,
      date,
      identificationMode,
      questionIds,
    };
  }

  private requireText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError('title, subject, professor, and date are required and cannot be empty');
    }

    return value;
  }

  private validateIdentificationMode(value: unknown): IdentificationMode {
    if (value === 'letters' || value === 'powers-of-2') {
      return value;
    }

    throw new ValidationError('identificationMode must be either "letters" or "powers-of-2"');
  }

  private validateQuestionIds(value: unknown): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new ValidationError('At least one questionId is required');
    }

    const invalid = value.some((entry) => typeof entry !== 'string' || entry.trim() === '');
    if (invalid) {
      throw new ValidationError('All questionIds must be valid non-empty strings');
    }

    return value as string[];
  }
}