import { Given, When, Then } from '@cucumber/cucumber';
import request, { Response } from 'supertest';
import { expect } from 'chai';
import app from '../../server/src/app';

type SharedScope = {
  lastResponse?: Response;
};

type QuestionResult = {
  questionIndex: number;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
};

type CorrectionResult = {
  examNumber: string;
  studentName: string;
  cpf: string;
  questions: QuestionResult[];
  finalScore: number;
  warning?: string;
};

let answerKeyCsvContent = '';
let studentCsvContent = '';
let columnMapJson: string | undefined;
let answerKeyUploadMeta: { filename: string; contentType: string } = {
  filename: 'answer_key.csv',
  contentType: 'text/csv',
};
let studentUploadMeta: { filename: string; contentType: string } = {
  filename: 'student_responses.csv',
  contentType: 'text/csv',
};
let currentCpfContext = '';

function setLastResponse(response: Response): void {
  (globalThis as SharedScope).lastResponse = response;
}

function getLastResponse(): Response {
  const response = (globalThis as SharedScope).lastResponse;
  if (!response) {
    throw new Error('No response available for correction assertions');
  }

  return response;
}

function getReport(): CorrectionResult[] {
  const response = getLastResponse();
  expect(response.status).to.equal(200);
  expect(response.body).to.be.an('array');
  return response.body as CorrectionResult[];
}

function getEntryByCpf(cpf: string): CorrectionResult {
  const report = getReport();
  const entry = report.find((item) => item.cpf === cpf);
  expect(entry, `Expected report entry for CPF ${cpf}`).to.exist;
  if (!entry) {
    throw new Error(`Missing report entry for CPF ${cpf}`);
  }

  return entry;
}

function getQuestionByName(entry: CorrectionResult, questionName: string): QuestionResult {
  const digits = questionName
    .split('')
    .filter((char) => char >= '0' && char <= '9')
    .join('');
  const questionIndex = Number.parseInt(digits, 10);
  const question = entry.questions.find((item) => item.questionIndex === questionIndex);
  expect(question, `Expected question ${questionName}`).to.exist;
  if (!question) {
    throw new Error(`Missing question ${questionName}`);
  }

  return question;
}

Given('the answer key CSV is:', (docString: string) => {
  answerKeyCsvContent = docString;
  answerKeyUploadMeta = { filename: 'answer_key.csv', contentType: 'text/csv' };
});

Given('the student responses CSV using the default format is:', (docString: string) => {
  studentCsvContent = docString;
  studentUploadMeta = { filename: 'student_responses.csv', contentType: 'text/csv' };
  columnMapJson = undefined;
});

Given('the student responses CSV with extra columns is:', (docString: string) => {
  studentCsvContent = docString;
  studentUploadMeta = { filename: 'student_responses_with_extra_columns.csv', contentType: 'text/csv' };
});

Given('the student responses CSV in Google Forms format is:', (docString: string) => {
  studentCsvContent = docString;
  studentUploadMeta = { filename: 'google_forms_export.csv', contentType: 'text/csv' };
});

Given('the correction request includes this columnMap:', (docString: string) => {
  columnMapJson = docString;
});

Given('the uploaded answer key file is not a CSV', () => {
  answerKeyCsvContent = 'this is not csv';
  answerKeyUploadMeta = { filename: 'answer_key.txt', contentType: 'text/plain' };
});

Given('the uploaded student responses file is not a CSV', () => {
  studentCsvContent = 'this is not csv';
  studentUploadMeta = { filename: 'responses.txt', contentType: 'text/plain' };
});

When('I submit both CSV files for correction in {string} mode', async (mode: string) => {
  let req = request(app)
    .post('/api/correct')
    .field('mode', mode)
    .attach('answerKeyCsv', Buffer.from(answerKeyCsvContent, 'utf-8'), answerKeyUploadMeta)
    .attach('studentResponsesCsv', Buffer.from(studentCsvContent, 'utf-8'), studentUploadMeta);

  if (columnMapJson) {
    req = req.field('columnMap', columnMapJson);
  }

  const response = await req;
  setLastResponse(response);
});

When('I submit both files for correction in {string} mode', async (mode: string) => {
  const response = await request(app)
    .post('/api/correct')
    .field('mode', mode)
    .attach('answerKeyCsv', Buffer.from(answerKeyCsvContent, 'utf-8'), answerKeyUploadMeta)
    .attach('studentResponsesCsv', Buffer.from(studentCsvContent, 'utf-8'), studentUploadMeta);

  setLastResponse(response);
});

Then('the response status should be {int}', (statusCode: number) => {
  const response = getLastResponse();
  expect(response.status).to.equal(statusCode);
});

Then('the response should be a JSON report with {int} entries', (entries: number) => {
  const report = getReport();
  expect(report).to.have.lengthOf(entries);
});

Then('the report should contain one entry per student', () => {
  const report = getReport();
  const cpfs = report.map((item) => item.cpf);
  expect(new Set(cpfs).size).to.equal(report.length);
});

Then('the report entry for cpf {string} should have finalScore {int}', (cpf: string, score: number) => {
  currentCpfContext = cpf;
  const entry = getEntryByCpf(cpf);
  expect(entry.finalScore).to.equal(score);
});

Then('the report entry for cpf {string} should have finalScore less than {int}', (cpf: string, score: number) => {
  currentCpfContext = cpf;
  const entry = getEntryByCpf(cpf);
  expect(entry.finalScore).to.be.lessThan(score);
});

Then('question {string} in that entry should have score {int}', (questionName: string, score: number) => {
  const entry = getEntryByCpf(currentCpfContext);
  const question = getQuestionByName(entry, questionName);
  expect(question.score).to.equal(score);
});

Then('question {string} in the entry for cpf {string} should have a non-zero score', (questionName: string, cpf: string) => {
  const entry = getEntryByCpf(cpf);
  const question = getQuestionByName(entry, questionName);
  expect(question.score).to.be.greaterThan(0);
});

Then('question {string} in the entry for cpf {string} should have score less than its maximum', (questionName: string, cpf: string) => {
  const entry = getEntryByCpf(cpf);
  const question = getQuestionByName(entry, questionName);
  expect(question.score).to.be.lessThan(1);
});

Then('each report entry should include examNumber, studentName and cpf', () => {
  const report = getReport();
  report.forEach((entry) => {
    expect(entry).to.have.property('examNumber');
    expect(entry).to.have.property('studentName');
    expect(entry).to.have.property('cpf');
  });
});

Then('each report entry should include a per-question breakdown', () => {
  const report = getReport();
  report.forEach((entry) => {
    expect(entry).to.have.property('questions');
    expect(entry.questions).to.be.an('array').and.not.empty;
  });
});

Then('each question breakdown should include studentAnswer, correctAnswer and score', () => {
  const report = getReport();
  report.forEach((entry) => {
    entry.questions.forEach((question) => {
      expect(question).to.have.property('studentAnswer');
      expect(question).to.have.property('correctAnswer');
      expect(question).to.have.property('score');
    });
  });
});

Then('each report entry should include finalScore', () => {
  const report = getReport();
  report.forEach((entry) => {
    expect(entry).to.have.property('finalScore');
  });
});

Then('the report should not include cpf {string}', (cpf: string) => {
  const report = getReport();
  const entry = report.find((item) => item.cpf === cpf);
  expect(entry).to.not.exist;
});

Then('the report should include cpf {string}', (cpf: string) => {
  const entry = getEntryByCpf(cpf);
  expect(entry).to.exist;
});

Then('the report entry for cpf {string} should include a non-empty warning', (cpf: string) => {
  const entry = getEntryByCpf(cpf);
  expect(entry.warning).to.be.a('string').and.not.empty;
});
