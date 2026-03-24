import { parse } from 'csv-parse/sync';
import { ValidationError } from '../errors';

export type CorrectionMode = 'strict' | 'lenient';

type CsvRow = Record<string, string>;

type AnswerKeyEntry = {
  examNumber: string;
  answersByQuestion: Record<string, string>;
};

export interface CorrectionColumnMap {
  examNumber: string;
  name?: string;
  studentName?: string;
  cpf: string;
  questions?: string[];
  [key: string]: unknown;
}

export interface QuestionCorrectionResult {
  questionIndex: number;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
}

export interface StudentCorrectionResult {
  examNumber: string;
  studentName: string;
  cpf: string;
  questions: QuestionCorrectionResult[];
  finalScore: number;
  warning?: string;
}

interface ResolvedStudentColumns {
  examNumber: string;
  studentName: string;
  cpf: string;
  questions: string[];
}

export class CorrectionService {
  correct(
    answerKeyCsvString: string,
    studentCsvString: string,
    mode: CorrectionMode,
    columnMap?: CorrectionColumnMap,
  ): StudentCorrectionResult[] {
    const answerKeyRows = this.parseCsv(answerKeyCsvString);
    const answerKeyHeader = this.extractHeader(answerKeyCsvString);
    const questionColumns = answerKeyHeader.filter((name) => /^q\d+$/i.test(name));

    if (questionColumns.length === 0) {
      throw new ValidationError('Answer key CSV must include at least one question column (q1, q2, ...)');
    }

    const answerKeyByExamNumber = this.buildAnswerKeyMap(answerKeyRows, questionColumns);
    const studentRows = this.parseCsv(studentCsvString);
    const resolvedColumns = this.resolveStudentColumns(questionColumns, columnMap);

    const results: StudentCorrectionResult[] = [];

    for (const studentRow of studentRows) {
      const rawExamNumber = this.getColumnValue(studentRow, resolvedColumns.examNumber);
      const normalizedExamNumber = this.normalizeExamNumber(rawExamNumber);

      if (normalizedExamNumber === '') {
        console.warn('[CorrectionService] Skipping student row with blank exam_number');
        continue;
      }

      const studentName = this.getColumnValue(studentRow, resolvedColumns.studentName);
      const cpf = this.getColumnValue(studentRow, resolvedColumns.cpf);
      const answerKeyEntry = answerKeyByExamNumber.get(normalizedExamNumber);

      if (!answerKeyEntry) {
        const emptyQuestions = questionColumns.map((_, index) => ({
          questionIndex: index + 1,
          studentAnswer: this.getColumnValue(studentRow, resolvedColumns.questions[index] ?? `q${index + 1}`),
          correctAnswer: '',
          score: 0,
        }));

        results.push({
          examNumber: normalizedExamNumber,
          studentName,
          cpf,
          questions: emptyQuestions,
          finalScore: 0,
          warning: 'Número de prova não encontrado no gabarito',
        });
        continue;
      }

      const questions: QuestionCorrectionResult[] = questionColumns.map((questionColumn, index) => {
        const studentColumnName = resolvedColumns.questions[index] ?? questionColumn;
        const studentAnswer = this.getColumnValue(studentRow, studentColumnName);
        const correctAnswer = answerKeyEntry.answersByQuestion[questionColumn] ?? '';
        const score = this.calculateQuestionScore(studentAnswer, correctAnswer, mode);

        return {
          questionIndex: index + 1,
          studentAnswer,
          correctAnswer,
          score,
        };
      });

      const sum = questions.reduce((acc, item) => acc + item.score, 0);
      const finalScore = this.round2((sum / questions.length) * 10);

      results.push({
        examNumber: normalizedExamNumber,
        studentName,
        cpf,
        questions,
        finalScore,
      });
    }

    return results;
  }

  private parseCsv(csvString: string): CsvRow[] {
    try {
      const rows: CsvRow[] = parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      return rows;
    } catch {
      throw new ValidationError('Invalid CSV format.');
    }
  }

  private extractHeader(csvString: string): string[] {
    const firstLine = csvString
      .split(/\r?\n/)
      .find((line) => line.trim() !== '');

    if (!firstLine) {
      throw new ValidationError('CSV content is empty.');
    }

    const headerRows: string[][] = parse(firstLine, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
    });

    return headerRows[0] ?? [];
  }

  private buildAnswerKeyMap(answerKeyRows: CsvRow[], questionColumns: string[]): Map<string, AnswerKeyEntry> {
    const map = new Map<string, AnswerKeyEntry>();

    for (const row of answerKeyRows) {
      const examNumber = this.normalizeExamNumber(this.getColumnValue(row, 'exam_number'));
      if (examNumber === '') {
        continue;
      }

      const answersByQuestion: Record<string, string> = {};
      for (const questionColumn of questionColumns) {
        answersByQuestion[questionColumn] = this.getColumnValue(row, questionColumn);
      }

      map.set(examNumber, {
        examNumber,
        answersByQuestion,
      });
    }

    return map;
  }

  private resolveStudentColumns(questionColumns: string[], columnMap?: CorrectionColumnMap): ResolvedStudentColumns {
    const examNumber = columnMap?.examNumber ?? 'exam_number';
    const studentName = columnMap?.name ?? columnMap?.studentName ?? 'student_name';
    const cpf = columnMap?.cpf ?? 'cpf';

    const questionColumnsFromMap = Array.isArray(columnMap?.questions)
      ? columnMap.questions.slice(0, questionColumns.length)
      : [];

    const questions = questionColumns.map((defaultQuestionName, index) => {
      if (questionColumnsFromMap[index]) {
        return questionColumnsFromMap[index];
      }

      const mappedByKey = columnMap?.[defaultQuestionName];
      return typeof mappedByKey === 'string' ? mappedByKey : defaultQuestionName;
    });

    return {
      examNumber,
      studentName,
      cpf,
      questions,
    };
  }

  private getColumnValue(row: CsvRow, targetColumn: string): string {
    const normalizedTarget = this.normalizeColumnName(targetColumn);
    const rowEntries = Object.entries(row);

    for (const [key, value] of rowEntries) {
      if (this.normalizeColumnName(key) === normalizedTarget) {
        return String(value ?? '').trim();
      }
    }

    return '';
  }

  private normalizeColumnName(value: string): string {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  private normalizeExamNumber(value: string): string {
    const trimmed = String(value ?? '').trim();
    if (trimmed === '') {
      return '';
    }

    if (/^\d+$/.test(trimmed)) {
      return String(Number.parseInt(trimmed, 10));
    }

    return trimmed.replace(/^0+/, '') || '0';
  }

  private isPowerOfTwoMode(expectedAnswer: string, studentAnswer: string): boolean {
    const expected = expectedAnswer.trim();
    const student = studentAnswer.trim();
    const numeric = /^\d+$/;

    if (expected === '' && student === '') {
      return false;
    }

    if (expected !== '' && !numeric.test(expected)) {
      return false;
    }

    if (student !== '' && !numeric.test(student)) {
      return false;
    }

    return true;
  }

  private calculateQuestionScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode): number {
    if (this.isPowerOfTwoMode(expectedAnswer, studentAnswer)) {
      return this.calculatePowerOfTwoScore(studentAnswer, expectedAnswer, mode);
    }

    return this.calculateLetterScore(studentAnswer, expectedAnswer, mode);
  }

  private calculateLetterScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode): number {
    const studentSet = this.toLetterSet(studentAnswer);
    const expectedSet = this.toLetterSet(expectedAnswer);

    if (mode === 'strict') {
      return this.areSetsEqual(studentSet, expectedSet) ? 1 : 0;
    }

    const universe = new Set<string>([...studentSet, ...expectedSet]);
    const totalAlternatives = Math.max(1, universe.size);

    let errors = 0;
    for (const alt of universe) {
      const studentSelected = studentSet.has(alt);
      const shouldBeSelected = expectedSet.has(alt);
      if (studentSelected !== shouldBeSelected) {
        errors += 1;
      }
    }

    return Math.max(0, this.round4(1 - errors / totalAlternatives));
  }

  private calculatePowerOfTwoScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode): number {
    const studentValue = Number.parseInt(studentAnswer.trim() || '0', 10);
    const expectedValue = Number.parseInt(expectedAnswer.trim() || '0', 10);

    if (!Number.isFinite(studentValue) || !Number.isFinite(expectedValue)) {
      return 0;
    }

    if (mode === 'strict') {
      return studentValue === expectedValue ? 1 : 0;
    }

    const maxValue = Math.max(studentValue, expectedValue, 0);
    const totalAlternatives = maxValue === 0 ? 1 : Math.floor(Math.log2(maxValue)) + 1;

    const xor = studentValue ^ expectedValue;
    let errors = 0;

    for (let bit = 0; bit < totalAlternatives; bit += 1) {
      if (((xor >> bit) & 1) === 1) {
        errors += 1;
      }
    }

    return Math.max(0, this.round4(1 - errors / totalAlternatives));
  }

  private toLetterSet(value: string): Set<string> {
    const normalized = value
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

    return new Set(normalized.split('').filter((char) => char !== ''));
  }

  private areSetsEqual(left: Set<string>, right: Set<string>): boolean {
    if (left.size !== right.size) {
      return false;
    }

    for (const entry of left) {
      if (!right.has(entry)) {
        return false;
      }
    }

    return true;
  }

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  private round4(value: number): number {
    return Number(value.toFixed(4));
  }
}
