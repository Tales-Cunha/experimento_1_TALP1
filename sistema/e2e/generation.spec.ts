import { test, expect } from '@playwright/test';
import { createExam, createQuestion, resetDatabase } from './helpers/api';

test.describe('PDF generation UI', () => {
  let examId = '';

  test.beforeEach(async () => {
    await resetDatabase();

    const q1 = await createQuestion('Questão G1', [
      { description: 'A', isCorrect: true },
      { description: 'B', isCorrect: false },
    ]);
    const q2 = await createQuestion('Questão G2', [
      { description: 'A', isCorrect: false },
      { description: 'B', isCorrect: true },
    ]);

    const exam = await createExam({
      title: 'Prova Geração',
      subject: 'História',
      professor: 'Prof. Lima',
      date: '2025-07-01',
      identificationMode: 'letters',
      questionIds: [q1.id, q2.id],
    });

    examId = exam.id;
  });

  test('Generate exam copies and download files', async ({ page }) => {
    await page.goto(`/exams/${examId}`);

    await page.locator('#copies-input').fill('3');

    const generateButton = page.getByRole('button', { name: /Gerar e Baixar/ });
    const generateResponse = page.waitForResponse((response) => {
      return response.url().includes(`/api/exams/${examId}/generate`) && response.status() === 200;
    });

    await generateButton.click();

    await expect(page.getByRole('button', { name: /Gerando provas…/ })).toBeVisible();
    await generateResponse;

    const chips = page.locator('.download-chips .file-chip');
    await expect(chips).toHaveCount(1);
    await expect(chips.nth(0)).toContainText('.zip');
  });

  test('Validate count limits', async ({ page }) => {
    await page.goto(`/exams/${examId}`);

    await page.getByRole('button', { name: 'Diminuir cópias' }).click();

    await expect(page.locator('#copies-input')).toHaveValue('1');
    await expect(page.locator('#copies-input')).toHaveAttribute('min', '1');
  });

  test('Open exam and click question inside Prévia das questões without leaving detail page', async ({ page }) => {
    await page.goto('/exams');

    await page.locator('.exam-title-link', { hasText: 'Prova Geração' }).click();
    await expect(page).toHaveURL(new RegExp(`/exams/${examId}$`));

    const firstQuestionTrigger = page.locator('.exam-accordion-trigger', { hasText: 'Questão G1' });
    await firstQuestionTrigger.click();

    await expect(page).toHaveURL(new RegExp(`/exams/${examId}$`));
    await expect(firstQuestionTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.exam-detail-error-banner')).toHaveCount(0);
  });
});
