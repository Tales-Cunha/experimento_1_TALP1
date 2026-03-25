import path from 'node:path';
import { test, expect } from '@playwright/test';
import { resetDatabase } from './helpers/api';

const fixturesDir = path.resolve(process.cwd(), 'e2e', 'fixtures');
const answerKeyPath = path.join(fixturesDir, 'answer_key.csv');
const studentResponsesPath = path.join(fixturesDir, 'student_responses.csv');
const googleFormsResponsesPath = path.join(fixturesDir, 'google_forms_responses.csv');

async function uploadDefaultStrictFiles(page: Parameters<typeof test>[0]['page']): Promise<void> {
  await page.locator('#answer-key-csv').setInputFiles(answerKeyPath);
  await page.locator('#students-csv').setInputFiles(studentResponsesPath);

  const strictButton = page.getByRole('button', { name: 'Rigorosa' });
  await expect(strictButton).toHaveAttribute('aria-pressed', 'true');
}

test.describe('Correction UI', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('Upload CSVs and view results', async ({ page }) => {
    await page.goto('/correction');
    await uploadDefaultStrictFiles(page);

    await page.getByRole('button', { name: 'Corrigir Provas' }).click();

    const table = page.locator('.results-table');
    await table.waitFor({ state: 'visible' });

    const anaRow = table.locator('tbody tr', { hasText: 'Ana Silva' });
    await expect(anaRow).toBeVisible();
    await expect(anaRow.locator('.final-score')).toContainText('10.00');

    const brunoRow = table.locator('tbody tr', { hasText: 'Bruno Costa' });
    await expect(brunoRow).toBeVisible();
    await expect(brunoRow.locator('.final-score')).not.toHaveText(/10(\.0+)?/);
  });

  test('Google Forms column mapping', async ({ page }) => {
    await page.goto('/correction');

    await page.locator('#answer-key-csv').setInputFiles(answerKeyPath);
    await page.locator('#students-csv').setInputFiles(googleFormsResponsesPath);

    await page.getByRole('button', { name: /Configurar colunas do Google Forms/i }).click();

    await page.getByLabel(/número da prova/i).fill('Número da Prova');
    await page.getByLabel(/nome do aluno/i).fill('Nome Completo');
    await page.getByLabel(/^Coluna: CPF$/i).fill('CPF');
    await page.getByLabel(/Colunas das questões/i).fill('Resposta Q1, Resposta Q2');

    await page.getByRole('button', { name: 'Corrigir Provas' }).click();

    const anaRow = page.locator('.results-table tbody tr', { hasText: 'Ana Silva' });
    await anaRow.waitFor({ state: 'visible' });
    await expect(anaRow.locator('.final-score')).toContainText('10.00');
  });

  test('Export report CSV', async ({ page }) => {
    await page.goto('/correction');
    await uploadDefaultStrictFiles(page);

    await page.getByRole('button', { name: 'Corrigir Provas' }).click();
    await page.locator('.results-table').waitFor({ state: 'visible' });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar Relatório CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename().toLowerCase()).toContain('relatorio');
  });
});
