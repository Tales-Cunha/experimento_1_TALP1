import { Given, When, Then, Before } from '@cucumber/cucumber';
import request, { Response } from 'supertest';
import { expect } from 'chai';
import app from '../../server/src/app';
import { db } from '../../server/src/db/db';

type StepTable = {
  rowsHash(): Record<string, string>;
  hashes(): Array<Record<string, string>>;
};

interface SharedScope {
  lastResponse?: Response;
}

interface AlternativePayload {
  description: string;
  isCorrect: boolean;
}

let lastResponse: Response | undefined;
let lastCreatedId = '';

function setSharedLastResponse(response: Response | undefined): void {
  lastResponse = response;
  (globalThis as SharedScope).lastResponse = response;
}

function getSharedLastResponse(): Response {
  const response = (globalThis as SharedScope).lastResponse ?? lastResponse;
  if (!response) {
    throw new Error('No response is available for assertion');
  }

  return response;
}

function parseAlternatives(raw: string): AlternativePayload[] {
  return raw.split(', ').map((entry) => ({
    description: entry.replace(' (correct)', '').replace(' (incorrect)', ''),
    isCorrect: entry.includes('(correct)'),
  }));
}

function buildSeedAlternatives(statement: string): AlternativePayload[] {
  if (statement === 'Question 1') {
    return [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ];
  }

  if (statement === 'Question 2') {
    return [
      { description: 'A', isCorrect: false },
      { description: 'B', isCorrect: true },
    ];
  }

  return [
    { description: 'A', isCorrect: true },
    { description: 'B', isCorrect: false },
  ];
}

Before(async () => {
  (db.run as (sql: string) => unknown)('DELETE FROM exam_questions');
  (db.run as (sql: string) => unknown)('DELETE FROM alternatives');
  (db.run as (sql: string) => unknown)('DELETE FROM questions');
  setSharedLastResponse(undefined);
});

Given('a clean database state', async () => {
  // Handled by the Before hook.
});

When('I create a question with the following details:', async (dataTable: StepTable) => {
  const data = dataTable.rowsHash();

  const response = await request(app)
    .post('/api/questions')
    .send({
      statement: data.statement,
      alternatives: parseAlternatives(data.alternatives),
    });

  setSharedLastResponse(response);

  if (response.status === 201) {
    lastCreatedId = response.body.id as string;
  }
});

Then('the question should be successfully created', () => {
  const response = getSharedLastResponse();
  expect(response.status).to.equal(201);
  expect(response.body).to.have.property('id');
});

Then('I should be able to retrieve the question with its {int} alternatives', async (count: number) => {
  const response = await request(app).get(`/api/questions/${lastCreatedId}`);
  expect(response.status).to.equal(200);
  expect(response.body.alternatives).to.have.lengthOf(count);
});

Given('a question exists with the statement {string}', async (statement: string) => {
  const response = await request(app)
    .post('/api/questions')
    .send({
      statement,
      alternatives: [
        { description: 'A', isCorrect: true },
        { description: 'B', isCorrect: false },
      ],
    });

  lastCreatedId = response.body.id as string;
});

When('I update that question to have:', async (dataTable: StepTable) => {
  const data = dataTable.rowsHash();
  const response = await request(app)
    .put(`/api/questions/${lastCreatedId}`)
    .send({
      statement: data.statement,
      alternatives: parseAlternatives(data.alternatives),
    });

  setSharedLastResponse(response);
});

Then('the question should reflect the new statement', () => {
  const response = getSharedLastResponse();
  expect(response.body.statement).to.equal('New Statement');
});

Then('the old alternatives should be replaced by the new ones', () => {
  const response = getSharedLastResponse();
  expect(response.body.alternatives).to.have.lengthOf(2);
  expect(response.body.alternatives[0].description).to.equal('Alt 1');
});

When('I delete that question', async () => {
  const response = await request(app).delete(`/api/questions/${lastCreatedId}`);
  setSharedLastResponse(response);
});

Then('the question should no longer exist in the system', async () => {
  const response = await request(app).get(`/api/questions/${lastCreatedId}`);
  expect(response.status).to.equal(404);
});

Given('the following questions exist:', async (dataTable: StepTable) => {
  for (const row of dataTable.hashes()) {
    await request(app)
      .post('/api/questions')
      .send({
        statement: row.statement,
        alternatives: buildSeedAlternatives(row.statement),
      });
  }

  await request(app)
    .post('/api/questions')
    .send({
      statement: 'Question Multi Correct',
      alternatives: [
        { description: 'A', isCorrect: true },
        { description: 'B', isCorrect: true },
        { description: 'C', isCorrect: false },
      ],
    });
});

When('I list all questions', async () => {
  const response = await request(app).get('/api/questions');
  setSharedLastResponse(response);
});

Then('I should receive a list containing {string} and {string}', (q1: string, q2: string) => {
  const response = getSharedLastResponse();
  const names = (response.body as Array<{ statement?: string; title?: string }>).map(
    (item) => item.statement ?? item.title ?? ''
  );

  expect(names).to.include(q1);
  expect(names).to.include(q2);
});

When('I attempt to create a question with fewer than {int} alternatives', async (_count: number) => {
  const response = await request(app)
    .post('/api/questions')
    .send({
      statement: 'Invalid',
      alternatives: [{ description: 'Only one', isCorrect: true }],
    });

  setSharedLastResponse(response);
});

Then('I should receive a {int} Unprocessable Entity error', (code: number) => {
  const response = getSharedLastResponse();
  expect(response.status).to.equal(code);
});

When('I attempt to create a question where no alternative is marked as correct', async () => {
  const response = await request(app)
    .post('/api/questions')
    .send({
      statement: 'Invalid',
      alternatives: [
        { description: 'A', isCorrect: false },
        { description: 'B', isCorrect: false },
      ],
    });

  setSharedLastResponse(response);
});

When('I attempt to retrieve a question with a non-existent ID', async () => {
  const response = await request(app).get('/api/questions/non-existent-uuid');
  setSharedLastResponse(response);
});

Then('I should receive a {int} Not Found error', (code: number) => {
  const response = getSharedLastResponse();
  expect(response.status).to.equal(code);
});
