import { Given, When, Then, Before } from '@cucumber/cucumber';
import request from 'supertest';
import { expect } from 'chai';
import app from '../../server/src/app';
import { db } from '../../server/src/db/db';
import { exams, questions, examQuestions } from '../../server/src/db/schema';
import { eq, inArray } from 'drizzle-orm';

let lastResponse: any;
let lastCreatedExamId: string;

function setLastResponse(res: any) {
  lastResponse = res;
  (global as any).lastResponse = res;
}

// Helper to get question IDs by statements
async function getQuestionIdsByStatements(statements: string[]): Promise<string[]> {
  const result = await db.select({ id: questions.id })
    .from(questions)
    .where(inArray(questions.statement, statements));
  return result.map(r => r.id);
}

Given('a clean exams state', async () => {
    (db.run as any)(`DELETE FROM exam_questions`);
    (db.run as any)(`DELETE FROM exams`);
});

When('I create an exam with the following details:', async (dataTable) => {
  const data = dataTable.rowsHash();
  const statements = data.questions.split(', ').map((s: string) => s.trim());
  const questionIds = await getQuestionIdsByStatements(statements);

  const res = await request(app)
    .post('/api/exams')
    .send({
      title: data.title,
      subject: data.subject,
      professor: data.professor,
      date: data.date,
      identificationMode: data.identification_mode,
      questionIds: questionIds
    });
  
  setLastResponse(res);
  if (res.status === 201) {
    lastCreatedExamId = res.body.id;
  }
});

Then('the exam should be successfully created', () => {
  expect(lastResponse.status).to.equal(201);
  expect(lastResponse.body).to.have.property('id');
});

Then('I should be able to retrieve the exam with its {int} questions', async (count: number) => {
  const res = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  expect(res.status).to.equal(200);
  expect(res.body.questions).to.have.lengthOf(count);
});

Then('the exam identification mode should be {string}', async (mode: string) => {
  const res = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  expect(res.body.identificationMode).to.equal(mode);
});

Given('an exam exists with the title {string} and questions {string}', async (title: string, questionsStr: string) => {
  const statements = questionsStr.split(', ').map(s => s.trim());
  const questionIds = await getQuestionIdsByStatements(statements);

  const res = await request(app)
    .post('/api/exams')
    .send({
      title: title,
      subject: 'Temporary Subject',
      professor: 'Temporary Prof',
      date: '2026-01-01',
      identificationMode: 'letters',
      questionIds: questionIds
    });
  
  lastCreatedExamId = res.body.id;
});

When('I update that exam to have:', async (dataTable) => {
  const data = dataTable.rowsHash();
  const statements = data.questions.split(', ').map((s: string) => s.trim());
  const questionIds = await getQuestionIdsByStatements(statements);

  // Get current exam to preserve fields required by validation
  const currentRes = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  const currentExam = currentRes.body;

  const res = await request(app)
    .put(`/api/exams/${lastCreatedExamId}`)
    .send({
      title: currentExam.title,
      subject: data.subject,
      professor: currentExam.professor,
      date: currentExam.date,
      identificationMode: currentExam.identificationMode,
      questionIds: questionIds
    });
  setLastResponse(res);
});

Then('the exam subject should be {string}', async (subject: string) => {
  const res = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  expect(res.body.subject).to.equal(subject);
});

Then('the exam should contain {string} instead of {string}', async (included: string, excluded: string) => {
  const res = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  const statements = res.body.questions.map((q: any) => q.statement);
  expect(statements).to.include(included);
  expect(statements).to.not.include(excluded);
});

Given('an exam exists with the title {string}', async (title: string) => {
  // Need at least one question to create exam
  const qList = await db.select({ id: questions.id }).from(questions).limit(1);
  const qId = qList[0].id;

  const res = await request(app)
    .post('/api/exams')
    .send({
      title: title,
      subject: 'Subject',
      professor: 'Prof',
      date: '2026-01-01',
      identificationMode: 'letters',
      questionIds: [qId]
    });
  lastCreatedExamId = res.body.id;
});

When('I delete that exam', async () => {
  const res = await request(app).delete(`/api/exams/${lastCreatedExamId}`);
  setLastResponse(res);
});

Then('the exam should no longer exist in the system', async () => {
  const res = await request(app).get(`/api/exams/${lastCreatedExamId}`);
  expect(res.status).to.equal(404);
});

Given('the following exams exist:', async (dataTable) => {
  const qList = await db.select({ id: questions.id }).from(questions).limit(1);
  const qId = qList[0].id;

  for (const row of dataTable.hashes()) {
    await request(app)
      .post('/api/exams')
      .send({
        title: row.title,
        subject: row.subject,
        professor: 'Prof',
        date: '2026-01-01',
        identificationMode: 'letters',
        questionIds: [qId]
      });
  }
});

When('I list all exams', async () => {
  const res = await request(app).get('/api/exams');
  setLastResponse(res);
});

When('I attempt to create an exam with no questions selected', async () => {
  const res = await request(app)
    .post('/api/exams')
    .send({
      title: 'No Questions',
      subject: 'Subject',
      professor: 'Prof',
      date: '2026-01-01',
      identificationMode: 'letters',
      questionIds: []
    });
  setLastResponse(res);
});

When('I attempt to create an exam referencing a non-existent question ID', async () => {
  const res = await request(app)
    .post('/api/exams')
    .send({
      title: 'Invalid Reference',
      subject: 'Subject',
      professor: 'Prof',
      date: '2026-01-01',
      identificationMode: 'letters',
      questionIds: ['non-existent-uuid']
    });
  setLastResponse(res);
});
