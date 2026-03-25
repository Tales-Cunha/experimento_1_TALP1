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

interface AnswerKeyData {
  answerKeyByExamNumber: Map<string, AnswerKeyEntry>;
  alternativesPerQuestion: Record<string, number>;
}

interface CsvParser {
  parseRows(input: string): CsvRow[];
  parseHeader(input: string): string[][];
}

interface UploadCorrectionRequest {
  answerKeyFile?: Express.Multer.File;
  studentResponsesFile?: Express.Multer.File;
  mode: unknown;
  columnMap: unknown;
}

export class CorrectionService {
  constructor(
    private readonly logger: Pick<Console, 'warn'> = console,
    private readonly csvParser: CsvParser = {
      parseRows: (input): CsvRow[] => parse(input, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }),
      parseHeader: (input): string[][] => parse(input, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
      }),
    },
  ) {}

  correctFromUpload(input: UploadCorrectionRequest): StudentCorrectionResult[] {
    const { answerKeyFile, studentResponsesFile } = input;

    if (!answerKeyFile || !studentResponsesFile) {
      throw new ValidationError('Both answerKeyCsv and studentResponsesCsv files are required');
    }

    if (!this.isCsvFile(answerKeyFile) || !this.isCsvFile(studentResponsesFile)) {
      throw new ValidationError('Both uploaded files must be CSV');
    }

    const mode = this.parseMode(input.mode);
    const columnMap = this.parseColumnMap(input.columnMap);

    return this.correct(
      answerKeyFile.buffer.toString('utf-8'),
      studentResponsesFile.buffer.toString('utf-8'),
      mode,
      columnMap,
    );
  }

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

    const { answerKeyByExamNumber, alternativesPerQuestion } = this.buildAnswerKeyData(answerKeyRows, questionColumns);
    const studentRows = this.parseCsv(studentCsvString);
    const resolvedColumns = this.resolveStudentColumns(questionColumns, columnMap);

    const results: StudentCorrectionResult[] = [];

    for (const studentRow of studentRows) {
      const rawExamNumber = this.getColumnValue(studentRow, resolvedColumns.examNumber);
      const normalizedExamNumber = this.normalizeExamNumber(rawExamNumber);

      if (normalizedExamNumber === '') {
        this.logger.warn('[CorrectionService] Skipping student row with blank exam_number');
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
        const score = this.calculateQuestionScore(studentAnswer, correctAnswer, mode, alternativesPerQuestion[questionColumn]);

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
      const rows = this.csvParser.parseRows(csvString);
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

    const headerRows = this.csvParser.parseHeader(firstLine);

    return headerRows[0] ?? [];
  }

  private processAnswerKeyRow(
    row: CsvRow,
    questionColumns: string[],
    map: Map<string, AnswerKeyEntry>,
    alternativesPerQuestion: Record<string, number>
  ) {
    const rawExamNumber = this.getColumnValue(row, 'exam_number');
    const examNumber = this.normalizeExamNumber(rawExamNumber);

    if (rawExamNumber.trim().toLowerCase() === 'alternatives') {
      for (const col of questionColumns) {
         const val = Number.parseInt(this.getColumnValue(row, col), 10);
         if (!Number.isNaN(val)) alternativesPerQuestion[col] = val;
      }
      return;
    }

    if (examNumber !== '') {
      const answersByQuestion: Record<string, string> = {};
      for (const col of questionColumns) {
        answersByQuestion[col] = this.getColumnValue(row, col);
      }
      map.set(examNumber, { examNumber, answersByQuestion });
    }
  }

  private buildAnswerKeyData(answerKeyRows: CsvRow[], questionColumns: string[]): AnswerKeyData {
    const map = new Map<string, AnswerKeyEntry>();
    const alternativesPerQuestion: Record<string, number> = {};

    for (const row of answerKeyRows) {
      this.processAnswerKeyRow(row, questionColumns, map, alternativesPerQuestion);
    }

    for (const col of questionColumns) {
       if (!alternativesPerQuestion[col]) alternativesPerQuestion[col] = 4;
    }

    return { answerKeyByExamNumber: map, alternativesPerQuestion };
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

  private calculateQuestionScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode, totalAlternatives: number): number {
    if (this.isPowerOfTwoMode(expectedAnswer, studentAnswer)) {
      return this.calculatePowerOfTwoScore(studentAnswer, expectedAnswer, mode, totalAlternatives);
    }

    return this.calculateLetterScore(studentAnswer, expectedAnswer, mode, totalAlternatives);
  }

  private calculateLetterScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode, totalAlternatives: number): number {
    const studentSet = this.toLetterSet(studentAnswer);
    const expectedSet = this.toLetterSet(expectedAnswer);

    if (mode === 'strict') {
      return this.areSetsEqual(studentSet, expectedSet) ? 1 : 0;
    }

    let errors = 0;
    for (let i = 0; i < totalAlternatives; i += 1) {
      const alt = String.fromCodePoint(65 + i);
      const studentSelected = studentSet.has(alt);
      const shouldBeSelected = expectedSet.has(alt);
      if (studentSelected !== shouldBeSelected) {
        errors += 1;
      }
    }

    return Math.max(0, this.round4(1 - errors / totalAlternatives));
  }

  private calculatePowerOfTwoScore(studentAnswer: string, expectedAnswer: string, mode: CorrectionMode, totalAlternatives: number): number {
    const studentValue = Number.parseInt(studentAnswer.trim() || '0', 10);
    const expectedValue = Number.parseInt(expectedAnswer.trim() || '0', 10);

    if (!Number.isFinite(studentValue) || !Number.isFinite(expectedValue)) {
      return 0;
    }

    if (mode === 'strict') {
      return studentValue === expectedValue ? 1 : 0;
    }

    let errors = 0;

    for (let i = 0; i < totalAlternatives; i++) {
      const bit = 1 << i;
      const studentSelected = (studentValue & bit) !== 0;
      const shouldBeSelected = (expectedValue & bit) !== 0;
      if (studentSelected !== shouldBeSelected) {
        errors += 1;
      }
    }

    return Math.max(0, this.round4(1 - errors / totalAlternatives));
  }

  private toLetterSet(value: string): Set<string> {
    const normalized = value
      .toUpperCase()
      .split('')
      .filter((char: string) => /^[A-Z]$/.test(char))
      .join('');

    return new Set(normalized.split('').filter((char: string) => char !== ''));
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

  private isCsvFile(file: Express.Multer.File): boolean {
    const mimetype = file.mimetype.toLocaleLowerCase();
    const filename = file.originalname.toLocaleLowerCase();

    return mimetype === 'text/csv' || filename.endsWith('.csv');
  }

  private parseMode(rawMode: unknown): CorrectionMode {
    const normalizedMode = typeof rawMode === 'string' ? rawMode.trim() : rawMode;
    if (normalizedMode === 'strict' || normalizedMode === 'lenient') {
      return normalizedMode;
    }

    throw new ValidationError('mode must be either "strict" or "lenient"');
  }

  private parseColumnMap(rawColumnMap: unknown): CorrectionColumnMap | undefined {
    const normalizedColumnMap = typeof rawColumnMap === 'string' ? rawColumnMap.trim() : rawColumnMap;

    if (normalizedColumnMap === undefined || normalizedColumnMap === null || normalizedColumnMap === '') {
      return undefined;
    }

    if (typeof normalizedColumnMap !== 'string') {
      throw new ValidationError('columnMap must be a JSON string when provided');
    }

    try {
      return JSON.parse(normalizedColumnMap) as CorrectionColumnMap;
    } catch {
      throw new ValidationError('columnMap must be valid JSON');
    }
  }
}
