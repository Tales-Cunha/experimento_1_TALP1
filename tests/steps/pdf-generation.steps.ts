import { Given, When, Then } from '@cucumber/cucumber';
import request, { Response } from 'supertest';
import { expect } from 'chai';
import app from '../../server/src/app';
import { db } from '../../server/src/db/db';
import { exams, examQuestions } from '../../server/src/db/schema';
import { eq, asc } from 'drizzle-orm';

interface GenerateSuccessBody {
  zipBase64: string;
  csv: string;
}

let lastGenerateResponse: Response;
let parsedCsvRows: string[][] = [];
let zipEntries: string[] = [];

function setLastResponse(res: Response): void {
  lastGenerateResponse = res;
  (globalThis as { lastResponse?: Response }).lastResponse = res;
}

function getExamIdByTitle(title: string): string {
  const exam = db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.title, title))
    .get();

  if (!exam) {
    throw new Error(`Exam with title "${title}" not found in test setup`);
  }

  return exam.id;
}

function parseCsvRows(csv: string): string[][] {
  return csv
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((cell) => cell.trim()));
}

function listZipEntries(buffer: Buffer): string[] {
  const entries: string[] = [];
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;

    if (fileNameEnd > buffer.length) {
      break;
    }

    entries.push(buffer.toString('utf8', fileNameStart, fileNameEnd));

    const dataStart = fileNameEnd + extraLength;
    const nextOffset = dataStart + compressedSize;

    if (nextOffset <= offset) {
      break;
    }

    offset = nextOffset;
  }

  return entries;
}

Given('the exam identification mode is {string}', async (mode: string) => {
  const existing = db.select().from(exams).orderBy(exams.title).all();
  const lastExam = existing.at(-1);

  if (!lastExam) {
    throw new Error('No exam found to update identification mode');
  }

  const linkedQuestionIds = db
    .select({ questionId: examQuestions.questionId })
    .from(examQuestions)
    .where(eq(examQuestions.examId, lastExam.id))
    .orderBy(asc(examQuestions.position))
    .all()
    .map((item) => item.questionId);

  await request(app)
    .put(`/api/exams/${lastExam.id}`)
    .send({
      title: lastExam.title,
      subject: lastExam.subject,
      professor: lastExam.professor,
      date: lastExam.date,
      identificationMode: mode,
      questionIds: linkedQuestionIds,
    });
});

When('I request to generate {int} copies of the {string} exam', async (count: number, title: string) => {
  const examId = getExamIdByTitle(title);
  const res = await request(app)
    .post(`/api/exams/${examId}/generate`)
    .send({ count });

  setLastResponse(res);

  if (res.status === 200) {
    const body = res.body as GenerateSuccessBody;
    parsedCsvRows = parseCsvRows(body.csv);
    zipEntries = listZipEntries(Buffer.from(body.zipBase64, 'base64'));
  }
});

When('I request to generate {int} copies of a non-existent exam ID', async (count: number) => {
  const res = await request(app)
    .post('/api/exams/00000000-0000-0000-0000-000000000000/generate')
    .send({ count });

  setLastResponse(res);
});

Then('the response should be a zip archive', () => {
  expect(lastGenerateResponse.status).to.equal(200);
  const body = lastGenerateResponse.body as GenerateSuccessBody;
  expect(body.zipBase64).to.be.a('string').and.not.empty;
});

Then('the archive should contain exactly {int} PDF files', (count: number) => {
  const pdfCount = zipEntries.filter((entry) => entry.toLowerCase().endsWith('.pdf')).length;
  expect(pdfCount).to.equal(count);
});

Then('the archive should contain exactly {int} CSV file', (count: number) => {
  const csvCount = zipEntries.filter((entry) => entry.toLowerCase().endsWith('.csv')).length;
  expect(csvCount).to.equal(count);
});

Then('the CSV file should have a header row and {int} data rows', (count: number) => {
  expect(parsedCsvRows.length).to.equal(count + 1);
});

Then('each data row in the CSV should start with a unique exam number', () => {
  const rows = parsedCsvRows.slice(1);
  const numbers = rows.map((row) => row[0]);
  const unique = new Set(numbers);
  expect(unique.size).to.equal(numbers.length);
});

Then('each data row in the CSV should have {int} answer columns', (count: number) => {
  const rows = parsedCsvRows.slice(1);
  rows.forEach((row) => {
    expect(row.length).to.equal(count + 1);
  });
});

Then('the answers in the CSV should be non-empty strings of letters', () => {
  const rows = parsedCsvRows.slice(1);
  const answerRegex = /^[A-Z]+$/;

  rows.forEach((row) => {
    row.slice(1).forEach((cell) => {
      expect(cell).to.match(answerRegex);
    });
  });
});

Then('the CSV answers should be non-empty numeric strings', () => {
  const rows = parsedCsvRows.slice(1);
  const answerRegex = /^\d+$/;

  rows.forEach((row) => {
    row.slice(1).forEach((cell) => {
      expect(cell).to.match(answerRegex);
    });
  });
});