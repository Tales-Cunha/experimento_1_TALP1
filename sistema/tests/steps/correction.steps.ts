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

const STANDARD_ANSWER_KEY_FIXTURE = [
  'exam_number,q1,q2',
  '001,AB,C',
  '002,A,BC',
].join('\n');

const STANDARD_STUDENT_RESPONSES_FIXTURE = [
  'exam_number,student_name,cpf,q1,q2',
  '001,Ana Silva,111.111.111-11,AB,C',
  '001,Bruno Costa,222.222.222-22,A,C',
  '002,Carla Souza,333.333.333-33,A,BC',
].join('\n');

const GOOGLE_FORMS_STUDENT_RESPONSES_FIXTURE = [
  'Timestamp,Email Address,Número da Prova,Nome Completo,CPF,Resposta Q1,Resposta Q2',
  '2024-06-01 09:00,ana@email.com,001,Ana Silva,111.111.111-11,AB,C',
  '2024-06-01 09:05,bruno@email.com,001,Bruno Costa,222.222.222-22,A,C',
  '2024-06-01 09:10,carla@email.com,002,Carla Souza,333.333.333-33,A,BC',
].join('\n');

const EDGE_CASE_STUDENT_RESPONSES_FIXTURE = [
  'exam_number,student_name,cpf,q1,q2',
  ',Ghost Student,000.000.000-00,A,B',
  '999,Unknown Student,444.444.444-44,A,B',
].join('\n');

const GOOGLE_FORMS_COLUMN_MAP_FIXTURE = JSON.stringify({
  examNumber: 'Número da Prova',
  name: 'Nome Completo',
  cpf: 'CPF',
  questions: ['Resposta Q1', 'Resposta Q2'],
});

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

async function submitCorrectionWithFiles(params: {
  answerKeyCsv: string;
  studentCsv: string;
  mode: string;
  columnMap?: string;
}): Promise<Response> {
  let req = request(app)
    .post('/api/correct')
    .field('mode', params.mode)
    .attach('answerKeyCsv', Buffer.from(params.answerKeyCsv, 'utf-8'), {
      filename: 'answer_key.csv',
      contentType: 'text/csv',
    })
    .attach('studentResponsesCsv', Buffer.from(params.studentCsv, 'utf-8'), {
      filename: 'student_responses.csv',
      contentType: 'text/csv',
    });

  if (params.columnMap) {
    req = req.field('columnMap', params.columnMap);
  }

  return req;
}

function projectComparableScores(report: CorrectionResult[]) {
  return report
    .map((entry) => ({
      cpf: entry.cpf,
      finalScore: entry.finalScore,
      questions: entry.questions
        .map((q) => ({ questionIndex: q.questionIndex, score: q.score }))
        .sort((a, b) => a.questionIndex - b.questionIndex),
    }))
    .sort((a, b) => a.cpf.localeCompare(b.cpf, 'pt-BR'));
}

Given('I use the standard answer key fixture', () => {
  answerKeyCsvContent = STANDARD_ANSWER_KEY_FIXTURE;
  answerKeyUploadMeta = { filename: 'answer_key.csv', contentType: 'text/csv' };
});

Given('I use the standard student responses fixture', () => {
  studentCsvContent = STANDARD_STUDENT_RESPONSES_FIXTURE;
  studentUploadMeta = { filename: 'student_responses.csv', contentType: 'text/csv' };
  columnMapJson = undefined;
});

Given('I use the Google Forms student responses fixture', () => {
  studentCsvContent = GOOGLE_FORMS_STUDENT_RESPONSES_FIXTURE;
  studentUploadMeta = { filename: 'google_forms_export.csv', contentType: 'text/csv' };
});

Given('I use the edge-case student responses fixture', () => {
  studentCsvContent = EDGE_CASE_STUDENT_RESPONSES_FIXTURE;
  studentUploadMeta = { filename: 'student_responses_edge_cases.csv', contentType: 'text/csv' };
  columnMapJson = undefined;
});

Given('I use the Google Forms columnMap fixture', () => {
  columnMapJson = GOOGLE_FORMS_COLUMN_MAP_FIXTURE;
});

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

Then('the Google Forms fixture scores should exactly match the standard fixture scores', async () => {
  const standardResponse = await submitCorrectionWithFiles({
    answerKeyCsv: STANDARD_ANSWER_KEY_FIXTURE,
    studentCsv: STANDARD_STUDENT_RESPONSES_FIXTURE,
    mode: 'strict',
  });
  expect(standardResponse.status).to.equal(200);

  const googleFormsResponse = await submitCorrectionWithFiles({
    answerKeyCsv: STANDARD_ANSWER_KEY_FIXTURE,
    studentCsv: GOOGLE_FORMS_STUDENT_RESPONSES_FIXTURE,
    mode: 'strict',
    columnMap: GOOGLE_FORMS_COLUMN_MAP_FIXTURE,
  });
  expect(googleFormsResponse.status).to.equal(200);

  const standardReport = projectComparableScores(standardResponse.body as CorrectionResult[]);
  const googleFormsReport = projectComparableScores(googleFormsResponse.body as CorrectionResult[]);

  expect(googleFormsReport).to.deep.equal(standardReport);
});

Then('the edge-case fixture should skip blank exam number and include unknown exam warning', async () => {
  const response = await submitCorrectionWithFiles({
    answerKeyCsv: STANDARD_ANSWER_KEY_FIXTURE,
    studentCsv: EDGE_CASE_STUDENT_RESPONSES_FIXTURE,
    mode: 'strict',
  });

  expect(response.status).to.equal(200);
  const report = response.body as CorrectionResult[];

  const blankExamStudent = report.find((entry) => entry.cpf === '000.000.000-00');
  expect(blankExamStudent).to.not.exist;

  const unknownExamStudent = report.find((entry) => entry.cpf === '444.444.444-44');
  expect(unknownExamStudent).to.exist;
  expect(unknownExamStudent?.finalScore).to.equal(0);
  expect(unknownExamStudent?.warning).to.be.a('string').and.not.empty;
});
