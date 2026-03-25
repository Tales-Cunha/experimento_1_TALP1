import { Then, When } from '@cucumber/cucumber';
import { expect } from 'chai';
import request, { Response } from 'supertest';
import app, { createApp } from '../../server/src/app';
import { QuestionRepository, type QuestionData } from '../../server/src/repositories/questionRepository';
import { ExamRepository, type CreateExamDTO } from '../../server/src/repositories/examRepository';

interface CapturedRepositoryError {
  name: string;
  message: string;
}

let securityLastResponse: Response;
let securityLastRepositoryError: CapturedRepositoryError | undefined;
let repositoryQuestionIdForExam = '';

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

When('I call QuestionRepository create with a null statement payload', async () => {
  securityLastRepositoryError = undefined;
  const repository = new QuestionRepository();

  const invalidPayload = {
    statement: null,
    alternatives: [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ],
  } as unknown as QuestionData;

  try {
    await repository.create(invalidPayload);
  } catch (error: unknown) {
    const normalized = error as { name?: string; message?: string };
    securityLastRepositoryError = {
      name: normalized.name ?? 'Error',
      message: normalized.message ?? '',
    };
  }
});

When('a valid question exists for repository-level exam creation', async () => {
  const questionRepository = new QuestionRepository();
  const createdQuestion = await questionRepository.create({
    statement: 'Repository question for exam constraint scenario',
    alternatives: [
      { description: 'Correct', isCorrect: true },
      { description: 'Incorrect', isCorrect: false },
    ],
  });

  repositoryQuestionIdForExam = createdQuestion.id;
  expect(repositoryQuestionIdForExam).to.not.equal('');
});

When('I call ExamRepository create with an invalid identification mode', async () => {
  securityLastRepositoryError = undefined;
  const repository = new ExamRepository();

  const invalidPayload = {
    title: 'Constraint exam',
    subject: 'Math',
    professor: 'Prof',
    date: '2026-03-25',
    identificationMode: 'invalid-mode',
    questionIds: [repositoryQuestionIdForExam],
  } as unknown as CreateExamDTO;

  try {
    await repository.create(invalidPayload);
  } catch (error: unknown) {
    const normalized = error as { name?: string; message?: string };
    securityLastRepositoryError = {
      name: normalized.name ?? 'Error',
      message: normalized.message ?? '',
    };
  }
});

Then('the repository call should fail with {string}', (expectedName: string) => {
  expect(securityLastRepositoryError).to.exist;
  expect(securityLastRepositoryError?.name).to.equal(expectedName);
});

Then('the repository error message should mention {string}', (snippet: string) => {
  expect(securityLastRepositoryError).to.exist;
  expect((securityLastRepositoryError?.message ?? '').toLowerCase()).to.include(snippet.toLowerCase());
});

When('I call {string} {string} in test mode', async (method: string, path: string) => {
  const testApp = createApp({ nodeEnv: 'test' });
  const upperMethod = method.toUpperCase();

  if (upperMethod === 'GET') {
    setSecurityResponse(await request(testApp).get(path));
    return;
  }

  throw new Error(`Unsupported method for this step: ${method}`);
});

When('I call {string} {string} with an invalid question payload in test mode', async (method: string, path: string) => {
  const testApp = createApp({ nodeEnv: 'test' });
  const upperMethod = method.toUpperCase();

  if (upperMethod === 'POST') {
    setSecurityResponse(await request(testApp).post(path).send({ statement: '', alternatives: [] }));
    return;
  }

  throw new Error(`Unsupported method for this step: ${method}`);
});

Then('the error payload should have only the {string} field', (fieldName: string) => {
  const response = getSecurityResponse();
  const keys = Object.keys(response.body as Record<string, unknown>);
  expect(keys).to.deep.equal([fieldName]);
});

Then('the error message should be exactly {string}', (expectedMessage: string) => {
  const response = getSecurityResponse();
  expect(String(response.body.error ?? '')).to.equal(expectedMessage);
});
