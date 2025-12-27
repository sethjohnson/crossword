import { test, expect } from '@playwright/test';

test.describe('Crossword App', () => {
    test('homepage loads successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Crossword/);
        await expect(page.locator('h1')).toContainText('Crossword');
    });
});
