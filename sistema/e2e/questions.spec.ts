import { test, expect } from '@playwright/test';
import { createQuestion, resetDatabase } from './helpers/api';

test.describe('Question management UI', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('Create a question', async ({ page }) => {
    await page.goto('/questions');

    await page.getByRole('button', { name: '+ Nova Questão' }).click();
    await page.getByLabel('Enunciado').fill('Qual é a capital do Brasil?');

    await page.getByPlaceholder('Alternativa 1').fill('Brasília');
    await page.getByPlaceholder('Alternativa 2').fill('São Paulo');
    await page.getByRole('button', { name: 'Salvar Questão' }).click();

    await expect(page.locator('[role="status"]')).toContainText('Questão salva com sucesso');
    await expect(page.getByText('Qual é a capital do Brasil?')).toBeVisible();
  });

  test('Edit a question', async ({ page }) => {
    await createQuestion('Qual é a capital do Brasil?', [
      { description: 'Brasília', isCorrect: true },
      { description: 'São Paulo', isCorrect: false },
    ]);

    await page.goto('/questions');

    await page.locator('.question-item', { hasText: 'Qual é a capital do Brasil?' }).getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Enunciado').fill('Qual é a capital federal do Brasil?');
    await page.getByRole('button', { name: 'Salvar Questão' }).click();

    await expect(page.getByText('Qual é a capital federal do Brasil?')).toBeVisible();
  });

  test('Delete a question', async ({ page }) => {
    await createQuestion('Questão para excluir', [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ]);

    await page.goto('/questions');

    page.on('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });

    await page.locator('.question-item', { hasText: 'Questão para excluir' }).getByRole('button', { name: 'Excluir' }).click();

    await expect(page.getByText('Questão para excluir')).not.toBeVisible();
  });

  test('Validation — submit with only one alternative', async ({ page }) => {
    await page.goto('/questions');

    await page.getByRole('button', { name: '+ Nova Questão' }).click();
    await page.getByLabel('Enunciado').fill('Questão inválida');
    await page.getByPlaceholder('Alternativa 1').fill('Única alternativa');
    await page.getByPlaceholder('Alternativa 2').fill('Alternativa removida');
    await page.getByRole('button', { name: '✕' }).nth(1).click();

    await page.getByRole('button', { name: 'Salvar Questão' }).click();

    await expect(page.locator('[role="alert"], .error-banner, .error-message')).toBeVisible();
  });
});
