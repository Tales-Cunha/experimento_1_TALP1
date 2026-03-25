import { When, Then } from '@cucumber/cucumber';
import request, { Response } from 'supertest';
import { expect } from 'chai';
import { parse } from 'csv-parse/sync';
import unzipper from 'unzipper';
import { Readable } from 'node:stream';
import app from '../../server/src/app';

interface GenerateSuccessBody {
  zipBase64: string;
  csv: string;
}

interface CorrectionResult {
  studentName: string;
  finalScore: number;
}

interface QuestionPayload {
  statement: string;
  alternatives: Array<{ description: string; isCorrect: boolean }>;
}

let smokeQuestionIds: string[] = [];
let smokeExamId = '';
let smokeExamTitle = '';
let smokeGenerateResponse: Response | undefined;
let smokeZipEntries: string[] = [];
let smokeAnswerKeyCsv = '';
let smokeAnswerKeyRows: string[][] = [];
let smokeStudentResponsesCsv = '';
let smokeCorrectionResponse: Response | undefined;

function parseCsvRows(csv: string): string[][] {
  return parse(csv, {
    skip_empty_lines: true,
    trim: true,
  });
}

async function listZipEntries(buffer: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const entries: string[] = [];
    const parser = unzipper.Parse();

    parser.on('entry', (entry) => {
      entries.push(entry.path);
      entry.autodrain();
    });

    parser.on('close', () => {
      resolve(entries);
    });

    parser.on('error', (error: Error) => {
      reject(error);
    });

    Readable.from(buffer).pipe(parser);
  });
}

function makeIncorrectAnswer(correctAnswer: string): string {
  const normalized = correctAnswer.trim().toUpperCase();

  if (normalized === 'A') {
    return 'B';
  }

  if (normalized === 'B') {
    return 'A';
  }

  if (normalized.length === 1 && normalized >= 'A' && normalized <= 'Z') {
    return normalized === 'Z' ? 'Y' : 'Z';
  }

  return 'A';
}

function getSmokeCorrectionReport(): CorrectionResult[] {
  if (!smokeCorrectionResponse) {
    throw new Error('Smoke correction response is not available');
  }

  expect(smokeCorrectionResponse.status).to.equal(200);
  expect(smokeCorrectionResponse.body).to.be.an('array');
  return smokeCorrectionResponse.body as CorrectionResult[];
}

function getStudentResult(studentName: string): CorrectionResult {
  const report = getSmokeCorrectionReport();
  const result = report.find((entry) => entry.studentName === studentName);
  expect(result, `Expected correction report entry for student ${studentName}`).to.exist;

  if (!result) {
    throw new Error(`Missing correction report entry for student ${studentName}`);
  }

  return result;
}

When('I create 3 smoke questions with 2 alternatives and 1 correct answer each', async () => {
  smokeQuestionIds = [];
  smokeExamId = '';
  smokeExamTitle = '';
  smokeGenerateResponse = undefined;
  smokeZipEntries = [];
  smokeAnswerKeyCsv = '';
  smokeAnswerKeyRows = [];
  smokeStudentResponsesCsv = '';
  smokeCorrectionResponse = undefined;

  const payloads: QuestionPayload[] = [
    {
      statement: 'Smoke Question 1',
      alternatives: [
        { description: 'Alternative A', isCorrect: true },
        { description: 'Alternative B', isCorrect: false },
      ],
    },
    {
      statement: 'Smoke Question 2',
      alternatives: [
        { description: 'Alternative A', isCorrect: false },
        { description: 'Alternative B', isCorrect: true },
      ],
    },
    {
      statement: 'Smoke Question 3',
      alternatives: [
        { description: 'Alternative A', isCorrect: true },
        { description: 'Alternative B', isCorrect: false },
      ],
    },
  ];

  for (const payload of payloads) {
    const response = await request(app).post('/api/questions').send(payload);
    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('id');
    smokeQuestionIds.push(response.body.id as string);
  }

  expect(smokeQuestionIds).to.have.lengthOf(3);
});

When('I create a smoke exam using all smoke questions in letter mode', async () => {
  expect(smokeQuestionIds).to.have.lengthOf(3);

  smokeExamTitle = `Smoke Exam ${Date.now()}`;

  const response = await request(app)
    .post('/api/exams')
    .send({
      title: smokeExamTitle,
      subject: 'Smoke Subject',
      professor: 'Smoke Professor',
      date: '2026-03-25',
      identificationMode: 'letters',
      questionIds: smokeQuestionIds,
    });

  expect(response.status).to.equal(201);
  expect(response.body).to.have.property('id');
  smokeExamId = response.body.id as string;
});

When('I generate {int} copies for the smoke exam', async (count: number) => {
  expect(smokeExamId).to.not.equal('');

  const response = await request(app).post(`/api/exams/${smokeExamId}/generate`).send({ count });

  smokeGenerateResponse = response;
  expect(response.status).to.equal(200);

  const body = response.body as GenerateSuccessBody;
  smokeAnswerKeyCsv = body.csv;
  smokeAnswerKeyRows = parseCsvRows(body.csv);
  smokeZipEntries = await listZipEntries(Buffer.from(body.zipBase64, 'base64'));
});

Then('the smoke generation zip should contain exactly {int} PDF files', (count: number) => {
  expect(smokeGenerateResponse?.status).to.equal(200);
  const pdfCount = smokeZipEntries.filter((entry) => entry.toLowerCase().endsWith('.pdf')).length;
  expect(pdfCount).to.equal(count);
});

Then('the smoke answer key CSV should have exactly {int} data rows with unique exam numbers', (count: number) => {
  expect(smokeAnswerKeyRows.length).to.equal(count + 1);

  const dataRows = smokeAnswerKeyRows.slice(1);
  const examNumbers = dataRows.map((row) => row[0]);
  expect(examNumbers).to.have.lengthOf(count);
  expect(new Set(examNumbers).size).to.equal(count);
});

When(
  'I build smoke student responses where Ana answers row 1 correctly and Bruno answers row 2 incorrectly',
  async () => {
    expect(smokeAnswerKeyRows.length).to.equal(3);

    const header = smokeAnswerKeyRows[0];
    const row1 = smokeAnswerKeyRows[1];
    const row2 = smokeAnswerKeyRows[2];

    const answerHeaders = header.slice(1);
    const anaAnswers = row1.slice(1);
    const brunoIncorrectAnswers = row2.slice(1).map((answer) => makeIncorrectAnswer(answer));

    const studentRows = [
      ['exam_number', 'student_name', 'cpf', ...answerHeaders],
      [row1[0], 'Ana', '11111111111', ...anaAnswers],
      [row2[0], 'Bruno', '22222222222', ...brunoIncorrectAnswers],
    ];

    smokeStudentResponsesCsv = studentRows.map((row) => row.join(',')).join('\n');
  }
);

When('I submit the smoke correction request in strict mode', async () => {
  expect(smokeAnswerKeyCsv).to.not.equal('');
  expect(smokeStudentResponsesCsv).to.not.equal('');

  smokeCorrectionResponse = await request(app)
    .post('/api/correct')
    .field('mode', 'strict')
    .attach('answerKeyCsv', Buffer.from(smokeAnswerKeyCsv, 'utf-8'), {
      filename: 'answer_key.csv',
      contentType: 'text/csv',
    })
    .attach('studentResponsesCsv', Buffer.from(smokeStudentResponsesCsv, 'utf-8'), {
      filename: 'student_responses.csv',
      contentType: 'text/csv',
    });

  expect(smokeCorrectionResponse.status).to.equal(200);
});

Then('the smoke report should give Ana final_score {int}', (score: number) => {
  const ana = getStudentResult('Ana');
  expect(ana.finalScore).to.equal(score);
});

Then('the smoke report should give Bruno final_score {int}', (score: number) => {
  const bruno = getStudentResult('Bruno');
  expect(bruno.finalScore).to.equal(score);
});