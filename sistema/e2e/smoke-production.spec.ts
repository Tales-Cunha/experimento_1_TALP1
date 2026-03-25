import { test, expect } from '@playwright/test';

test.describe('Production Deployment Smoke Test', () => {
  // Use the live deployed URL
  test.use({ baseURL: 'https://experimento-1-talp1-1-front.onrender.com' });

  test('should load the questions page correctly', async ({ page }) => {
    // Navigate to the questions page
    await page.goto('/questions');

    // Wait for the app to initialize and fetch questions
    await expect(page.locator('h1', { hasText: 'Banco de Questões' })).toBeVisible({ timeout: 15000 });

    // Verify that the "Nova Questão" button renders 
    // (This proves React Router and the App content mounted correctly)
    await expect(page.getByRole('button', { name: '+ Nova Questão' })).toBeVisible();

    // Verify it either shows questions or the empty state message
    // (proves that it successfully resolved the API call to your backend without throwing a network error)
    const listLocator = page.locator('.questions-list');
    await expect(listLocator).toBeVisible();
    
    // We expect either "Nenhuma questão cadastrada." or at least one ".question-item"
    const hasItems = await listLocator.locator('.question-item').count() > 0;
    const hasEmptyState = await page.getByText('Nenhuma questão cadastrada.').isVisible();
    
    expect(hasItems || hasEmptyState).toBeTruthy();
  });
});
