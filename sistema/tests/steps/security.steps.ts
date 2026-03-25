import { Then, When } from '@cucumber/cucumber';
import { expect } from 'chai';
import request, { Response } from 'supertest';
import app, { createApp } from '../../server/src/app';

let securityLastResponse: Response;

function setSecurityResponse(response: Response): void {
  securityLastResponse = response;
  (globalThis as { lastResponse?: Response }).lastResponse = response;
}

function getSecurityResponse(): Response {
  const shared = (globalThis as { lastResponse?: Response }).lastResponse;
  const response = shared ?? securityLastResponse;
  if (!response) {
    throw new Error('No response available for security assertions');
  }

  return response;
}

Then('the created question statement should be {string}', async (expected: string) => {
  const latestResponse = getSecurityResponse();
  const questionId = String(latestResponse.body.id ?? '');
  const response = await request(app).get(`/api/questions/${questionId}`);
  expect(response.status).to.equal(200);
  expect(response.body.statement).to.equal(expected);
});

Then('the created question alternative {int} should be {string}', async (index: number, expected: string) => {
  const latestResponse = getSecurityResponse();
  const questionId = String(latestResponse.body.id ?? '');
  const response = await request(app).get(`/api/questions/${questionId}`);
  expect(response.status).to.equal(200);
  expect(response.body.alternatives[index - 1].description).to.equal(expected);
});

Then('the created exam field {string} should be {string}', async (field: string, expected: string) => {
  const latestResponse = getSecurityResponse();
  const examId = String(latestResponse.body.id ?? '');
  const response = await request(app).get(`/api/exams/${examId}`);
  expect(response.status).to.equal(200);
  expect(String(response.body[field])).to.equal(expected);
});

When('I submit a JSON payload larger than 1MB to {string} {string}', async (method: string, path: string) => {
  const largeString = 'a'.repeat(1024 * 1024 + 10);
  const payload = {
    statement: largeString,
    alternatives: [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ],
  };

  const upperMethod = method.toUpperCase();
  let response: Response;

  if (upperMethod === 'POST') {
    response = await request(app).post(path).send(payload);
  } else if (upperMethod === 'PUT') {
    response = await request(app).put(path).send(payload);
  } else {
    throw new Error(`Unsupported method for this step: ${method}`);
  }

  setSecurityResponse(response);
});

When('I call {string} {string} with Origin {string} in development mode', async (method: string, path: string, origin: string) => {
  const devApp = createApp({ nodeEnv: 'development' });
  const upperMethod = method.toUpperCase();
  let response: Response;

  if (upperMethod === 'GET') {
    response = await request(devApp).get(path).set('Origin', origin);
  } else {
    throw new Error(`Unsupported method for this step: ${method}`);
  }

  setSecurityResponse(response);
});

Then('the CORS allow origin header should be {string}', (expected: string) => {
  const response = getSecurityResponse();
  expect(response.headers['access-control-allow-origin']).to.equal(expected);
});

Then('the CORS allow origin header should not be {string}', (unexpected: string) => {
  const response = getSecurityResponse();
  expect(response.headers['access-control-allow-origin']).to.not.equal(unexpected);
});

Then('the error message should mention {string}', (snippet: string) => {
  const response = getSecurityResponse();
  const message = String(response.body.error ?? response.body.message ?? '');
  expect(message.toLowerCase()).to.include(snippet.toLowerCase());
});
