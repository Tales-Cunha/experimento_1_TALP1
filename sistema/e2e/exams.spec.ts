import { test, expect } from '@playwright/test';
import { createExam, createQuestion, resetDatabase } from './helpers/api';

test.describe('Exam management UI', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('Create an exam', async ({ page }) => {
    const q1 = await createQuestion('Pergunta 1', [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ]);
    const q2 = await createQuestion('Pergunta 2', [
      { description: 'A', isCorrect: false },
      { description: 'B', isCorrect: true },
    ]);

    await page.goto('/exams/new');

    await page.getByLabel('Título').fill('Prova 1');
    await page.getByLabel('Disciplina').fill('Matemática');
    await page.getByLabel('Professor').fill('Prof. Silva');
    await page.getByLabel('Data').fill('2025-07-01');
    await page.getByLabel('Letras').check();

    await page.locator('.question-item', { hasText: q1.statement }).click();
    await page.locator('.question-item', { hasText: q2.statement }).click();

    await page.getByRole('button', { name: 'Salvar Prova' }).click();
    await page.waitForURL('**/exams');
    await expect(page.getByText('Prova 1')).toBeVisible();
  });

  test('Edit an exam', async ({ page }) => {
    const question = await createQuestion('Pergunta base', [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ]);

    await createExam({
      title: 'Prova Editável',
      subject: 'Matemática',
      professor: 'Prof. Silva',
      date: '2025-07-01',
      identificationMode: 'letters',
      questionIds: [question.id],
    });

    await page.goto('/exams');

    await page.locator('.item-card', { hasText: 'Prova Editável' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Disciplina').fill('Física');
    await page.getByRole('button', { name: 'Salvar Prova' }).click();

    await expect(page.locator('.item-card', { hasText: 'Prova Editável' }).locator('.badge')).toHaveText('Física');
  });

  test('Delete an exam', async ({ page }) => {
    const question = await createQuestion('Pergunta para exclusão', [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ]);

    await createExam({
      title: 'Prova para excluir',
      subject: 'Biologia',
      professor: 'Prof. Souza',
      date: '2025-07-01',
      identificationMode: 'letters',
      questionIds: [question.id],
    });

    await page.goto('/exams');

    page.on('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });

    const deleteResponse = page.waitForResponse((response) => {
      return response.url().includes('/api/exams/') && response.request().method() === 'DELETE' && response.status() === 204;
    });

    await page.locator('.item-card', { hasText: 'Prova para excluir' }).getByRole('button', { name: 'Delete' }).click();
    await deleteResponse;

    const deletedCard = page.locator('.item-card', { hasText: 'Prova para excluir' });
    await expect(deletedCard).toHaveCount(0);
  });
});
