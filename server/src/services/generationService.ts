import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { ExamRepository } from '../repositories/examRepository';
import { QuestionRepository } from '../repositories/questionRepository';

type IdentificationMode = 'letters' | 'powers-of-2';

interface LoadedAlternative {
  id: string;
  description: string;
  isCorrect: boolean;
}

interface LoadedQuestion {
  id: string;
  statement: string;
  alternatives: LoadedAlternative[];
}

interface LoadedExam {
  id: string;
  title: string;
  subject: string;
  professor: string;
  date: string;
  identificationMode: IdentificationMode;
  questions: LoadedQuestion[];
}

interface GeneratedExamArtifact {
  examNumber: string;
  answers: string[];
  pdf: Buffer;
}

export interface GenerationResult {
  zipBuffer: Buffer;
  csv: string;
}

type RandomGenerator = () => number;

export class GenerationService {
  private readonly examRepository = new ExamRepository();
  private readonly questionRepository = new QuestionRepository();

  async generate(examId: string, count: number): Promise<GenerationResult> {
    const loadedExam = await this.loadExamWithQuestionsAndAlternatives(examId);
    const generated = await this.generateArtifacts(loadedExam, count);
    const csv = this.buildCsv(generated, loadedExam.questions.length);
    const zipBuffer = await this.buildZip(generated, csv, loadedExam.title);
    return { zipBuffer, csv };
  }

  private async loadExamWithQuestionsAndAlternatives(examId: string): Promise<LoadedExam> {
    const exam = await this.examRepository.findById(examId);
    const questions: LoadedQuestion[] = [];

    for (const questionRef of exam.questions) {
      const complete = await this.questionRepository.findById(questionRef.id);
      questions.push({
        id: complete.id,
        statement: complete.statement,
        alternatives: complete.alternatives.map((alt) => ({
          id: alt.id,
          description: alt.description,
          isCorrect: Boolean(alt.isCorrect),
        })),
      });
    }

    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      professor: exam.professor,
      date: exam.date,
      identificationMode: exam.identificationMode as IdentificationMode,
      questions,
    };
  }

  private async generateArtifacts(exam: LoadedExam, count: number): Promise<GeneratedExamArtifact[]> {
    const generated: GeneratedExamArtifact[] = [];

    for (let i = 0; i < count; i += 1) {
      const examNumber = String(i + 1).padStart(3, '0');
      const seed = this.randomSeed();
      const shuffledQuestions = this.fisherYatesShuffle([...exam.questions], this.createSeededRng(seed));
      const answers: string[] = [];

      const examQuestions = shuffledQuestions.map((question, questionIndex) => {
        const alternatives = this.fisherYatesShuffle(
          [...question.alternatives],
          this.createSeededRng(seed + (questionIndex + 1) * 7919),
        );

        answers.push(this.buildAnswerValue(exam.identificationMode, alternatives));
        return { ...question, alternatives };
      });

      const pdf = await this.buildPdf(exam, examNumber, examQuestions);
      generated.push({ examNumber, answers, pdf });
    }

    return generated;
  }

  private randomSeed(): number {
    return randomBytes(4).readUInt32LE(0);
  }

  private createSeededRng(seed: number): RandomGenerator {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  private fisherYatesShuffle<T>(items: T[], random: RandomGenerator): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  private buildAnswerValue(mode: IdentificationMode, alternatives: LoadedAlternative[]): string {
    if (mode === 'powers-of-2') {
      const value = alternatives.reduce((sum, alt, index) => {
        if (!alt.isCorrect) {
          return sum;
        }
        return sum + 2 ** index;
      }, 0);
      return String(value);
    }

    const letters = alternatives
    .map((alt, index) => ({ alt, label: String.fromCodePoint(65 + index) }))
      .filter((item) => item.alt.isCorrect)
      .map((item) => item.label)
      .join('');

    return letters;
  }

  private async buildPdf(
    exam: LoadedExam,
    examNumber: string,
    questions: LoadedQuestion[],
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    this.drawPageFrame(doc, exam, examNumber);
    doc.on('pageAdded', () => this.drawPageFrame(doc, exam, examNumber));

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      doc.moveDown(0.4);
      doc.fontSize(12).text(`${index + 1}. ${question.statement}`, { align: 'left' });

      question.alternatives.forEach((alternative, altIndex) => {
        const label = exam.identificationMode === 'letters'
          ? String.fromCodePoint(65 + altIndex)
          : String(2 ** altIndex);
        doc.text(`   ${label}) ${alternative.description}`);
      });

      doc.moveDown(0.3);
      doc.text('   Resposta: __________________________________');
      doc.moveDown(0.4);
    }

    doc.addPage();
    doc.moveDown(6);
    doc.fontSize(14).text('Nome: ________________________________');
    doc.moveDown(0.8);
    doc.fontSize(14).text('CPF:  ________________________________');

    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  private drawPageFrame(doc: InstanceType<typeof PDFDocument>, exam: LoadedExam, examNumber: string): void {
    const header = `${exam.title} | ${exam.subject} | ${exam.professor} | ${exam.date}`;
    const footer = `Prova nº ${examNumber}`;
    const footerY = doc.page.height - 68;

    doc.fontSize(10).text(header, 50, 30, {
      align: 'center',
      width: doc.page.width - 100,
      lineBreak: false,
    });
    doc.fontSize(10).text(footer, 50, footerY, {
      align: 'center',
      width: doc.page.width - 100,
      lineBreak: false,
    });
    doc.moveTo(50, 48).lineTo(doc.page.width - 50, 48).stroke();
    doc.moveTo(50, doc.page.height - 52).lineTo(doc.page.width - 50, doc.page.height - 52).stroke();
    doc.y = 65;
  }

  private buildCsv(generated: GeneratedExamArtifact[], questionCount: number): string {
    const header = ['exam_number'];
    for (let i = 0; i < questionCount; i += 1) {
      header.push(`q${i + 1}`);
    }

    const lines = [header.join(',')];
    generated.forEach((item) => {
      lines.push([item.examNumber, ...item.answers].join(','));
    });

    return `${lines.join('\n')}\n`;
  }

  private async buildZip(generated: GeneratedExamArtifact[], csv: string, title: string): Promise<Buffer> {
    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);
      archive.on('error', reject);

      archive.pipe(passthrough);
      generated.forEach((item) => {
        archive.append(item.pdf, { name: `${this.slug(title)}_${item.examNumber}.pdf` });
      });
      archive.append(csv, { name: 'answer_key.csv' });

      archive.finalize();
    });
  }

  private slug(value: string): string {
    const lower = value.toLowerCase();
    let result = '';
    let prevUnderscore = false;

    for (const char of lower) {
      const isAlphaNum = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
      if (isAlphaNum) {
        result += char;
        prevUnderscore = false;
        continue;
      }

      if (!prevUnderscore && result.length > 0) {
        result += '_';
        prevUnderscore = true;
      }
    }

    const trimmed = result.endsWith('_') ? result.slice(0, -1) : result;
    return trimmed.length > 0 ? trimmed : 'exam';
  }
}