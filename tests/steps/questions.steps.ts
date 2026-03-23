import { Given, When, Then, Before } from '@cucumber/cucumber';
import request from 'supertest';
import { expect } from 'chai';
import app from '../../server/src/app';
import { db } from '../../server/src/db/db';
import { questions, alternatives, examQuestions } from '../../server/src/db/schema';
import { eq } from 'drizzle-orm';

let lastResponse: any;
let lastCreatedId: string;

Before(async () => {
  // Use DB instance directly to reset tables
  (db.run as any)(`DELETE FROM exam_questions`);
  (db.run as any)(`DELETE FROM alternatives`);
  (db.run as any)(`DELETE FROM questions`);
});

Given('a clean database state', async () => {
    // Handled in Before hook to ensure start of every scenario
});

When('I create a question with the following details:', async (dataTable) => {
  const data = dataTable.rowsHash();
  const alts = data.alternatives.split(', ').map((a: string) => ({
    description: a.replace(' (correct)', '').replace(' (incorrect)', ''),
    isCorrect: a.includes('(correct)')
  }));

  lastResponse = await request(app)
    .post('/api/questions')
    .send({
      statement: data.statement,
      alternatives: alts
    });
  
  if (lastResponse.status === 201) {
    lastCreatedId = lastResponse.body.id;
  }
});

Then('the question should be successfully created', () => {
  expect(lastResponse.status).to.equal(201);
  expect(lastResponse.body).to.have.property('id');
});

Then('I should be able to retrieve the question with its {int} alternatives', async (count: number) => {
  const res = await request(app).get(`/api/questions/${lastCreatedId}`);
  expect(res.status).to.equal(200);
  expect(res.body.alternatives).to.have.lengthOf(count);
});

Given('a question exists with the statement {string}', async (statement: string) => {
  const res = await request(app)
    .post('/api/questions')
    .send({
      statement: statement,
      alternatives: [
        { description: 'A', isCorrect: true },
        { description: 'B', isCorrect: false }
      ]
    });
  lastCreatedId = res.body.id;
});

When('I update that question to have:', async (dataTable) => {
  const data = dataTable.rowsHash();
  const alts = data.alternatives.split(', ').map((a: string) => ({
    description: a.replace(' (correct)', '').replace(' (incorrect)', ''),
    isCorrect: a.includes('(correct)')
  }));

  lastResponse = await request(app)
    .put(`/api/questions/${lastCreatedId}`)
    .send({
      statement: data.statement,
      alternatives: alts
    });
});

Then('the question should reflect the new statement', () => {
  expect(lastResponse.body.statement).to.equal('New Statement');
});

Then('the old alternatives should be replaced by the new ones', () => {
  expect(lastResponse.body.alternatives).to.have.lengthOf(2);
  expect(lastResponse.body.alternatives[0].description).to.equal('Alt 1');
});

When('I delete that question', async () => {
  lastResponse = await request(app).delete(`/api/questions/${lastCreatedId}`);
});

Then('the question should no longer exist in the system', async () => {
  const res = await request(app).get(`/api/questions/${lastCreatedId}`);
  expect(res.status).to.equal(404);
});

Given('the following questions exist:', async (dataTable) => {
  for (const row of dataTable.hashes()) {
    await request(app)
      .post('/api/questions')
      .send({
        statement: row.statement,
        alternatives: [
          { description: 'A', isCorrect: true },
          { description: 'B', isCorrect: false }
        ]
      });
  }
});

When('I list all questions', async () => {
  lastResponse = await request(app).get('/api/questions');
});

Then('I should receive a list containing {string} and {string}', (q1: string, q2: string) => {
  const statements = lastResponse.body.map((q: any) => q.statement);
  expect(statements).to.include(q1);
  expect(statements).to.include(q2);
});

When('I attempt to create a question with fewer than {int} alternatives', async (count: number) => {
  lastResponse = await request(app)
    .post('/api/questions')
    .send({
      statement: 'Invalid',
      alternatives: [{ description: 'Only one', isCorrect: true }]
    });
});

Then('I should receive a {int} Unprocessable Entity error', (code: number) => {
  expect(lastResponse.status).to.equal(code);
});

When('I attempt to create a question where no alternative is marked as correct', async () => {
  lastResponse = await request(app)
    .post('/api/questions')
    .send({
      statement: 'Invalid',
      alternatives: [
        { description: 'A', isCorrect: false },
        { description: 'B', isCorrect: false }
      ]
    });
});

When('I attempt to retrieve a question with a non-existent ID', async () => {
  lastResponse = await request(app).get('/api/questions/non-existent-uuid');
});

Then('I should receive a {int} Not Found error', (code: number) => {
  expect(lastResponse.status).to.equal(code);
});
