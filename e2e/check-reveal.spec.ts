import { test, expect } from '@playwright/test';

test.describe('Check and Reveal', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.crossword-grid')).toBeVisible();
    });

    test('Check button marks incorrect cells', async ({ page }) => {
        // Type a wrong letter in first cell
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('X');

        // Click Check button
        await page.getByRole('button', { name: /Check/ }).click();

        // First cell should be marked incorrect (solution is 'O')
        await expect(
            page.locator('.cell[data-row="0"][data-col="0"]')
        ).toHaveClass(/is-incorrect/);
    });

    test('Reveal button fills grid with solution', async ({ page }) => {
        // Override confirm to auto-accept
        await page.evaluate(() => {
            window.confirm = () => true;
        });

        // Click Reveal button
        await page.getByRole('button', { name: /Reveal/ }).click();

        // First cell should have solution value 'O'
        await expect(
            page.locator('.cell[data-row="0"][data-col="0"] .cell-value')
        ).toHaveText('O');

        // Check another cell (second cell, should be 'R')
        await expect(
            page.locator('.cell[data-row="0"][data-col="1"] .cell-value')
        ).toHaveText('R');
    });

    test('Completion modal appears when puzzle is solved', async ({ page }) => {
        // Override confirm to auto-accept
        await page.evaluate(() => {
            window.confirm = () => true;
        });

        // Click Reveal to complete the puzzle
        await page.getByRole('button', { name: /Reveal/ }).click();

        // Wait for completion modal
        await expect(page.locator('.modal.is-active')).toBeVisible();
        await expect(page.locator('.modal')).toContainText('Congratulations');
    });

    test('Check clears incorrect state when user edits cell', async ({ page }) => {
        // Type a wrong letter
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('X');

        // Check the puzzle
        await page.getByRole('button', { name: /Check/ }).click();

        // Verify cell is marked incorrect
        await expect(
            page.locator('.cell[data-row="0"][data-col="0"]')
        ).toHaveClass(/is-incorrect/);

        // Go back to first cell and type correct letter
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('O');

        // Incorrect state should be cleared
        await expect(
            page.locator('.cell[data-row="0"][data-col="0"]')
        ).not.toHaveClass(/is-incorrect/);
    });
});
