/**
 * Core E2E tests for the crossword app.
 * Tests upload, grid interaction, and check/reveal features.
 */
import { test, expect, request } from '@playwright/test';

// Puzzle fixture used for all tests
const testPuzzle = {
    version: "http://ipuz.org/v2",
    kind: ["http://ipuz.org/crossword#1"],
    dimensions: { width: 3, height: 3 },
    puzzle: [[1, 2, 3], [4, 0, 0], [5, 0, 0]],
    solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
    clues: {
        Across: [[1, 'First row'], [4, 'Second row'], [5, 'Third row']],
        Down: [[1, 'First col'], [2, 'Second col'], [3, 'Third col']]
    }
};

test.describe.serial('Crossword App E2E', () => {
    let puzzleId: string;

    test('upload page loads', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.upload-zone')).toBeVisible();
    });

    test('upload puzzle via UI', async ({ page }) => {
        await page.goto('/');

        await page.locator('input[type="file"]').setInputFiles({
            name: 'test.ipuz',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(testPuzzle))
        });

        // Wait for redirect
        await expect(page).toHaveURL(/#puzzle\//, { timeout: 20000 });

        // Extract puzzle ID from URL for later tests
        const url = page.url();
        const match = url.match(/#puzzle\/([a-f0-9-]+)/);
        expect(match).toBeTruthy();
        puzzleId = match![1];

        // Grid should be visible
        await expect(page.locator('.crossword-grid')).toBeVisible();
    });

    test('can select and type in cells', async ({ page }) => {
        // Use stored puzzleId from previous test
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible({ timeout: 10000 });

        const cell = page.locator('.cell[data-row="0"][data-col="0"]');
        await cell.click();
        await expect(cell).toHaveClass(/is-selected/);

        await page.keyboard.press('X');
        await expect(cell.locator('.cell-value')).toHaveText('X');
    });

    test('check marks wrong cells', async ({ page }) => {
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible({ timeout: 10000 });

        // Type wrong letter
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('X');

        // Check should mark it incorrect
        await page.getByRole('button', { name: /Check/ }).click();
        await expect(page.locator('.cell[data-row="0"][data-col="0"]')).toHaveClass(/is-incorrect/);
    });

    test('reveal fills solution', async ({ page }) => {
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible({ timeout: 10000 });

        await page.evaluate(() => { window.confirm = () => true; });
        await page.getByRole('button', { name: /Reveal/ }).click();

        await expect(page.locator('.cell[data-row="0"][data-col="0"] .cell-value')).toHaveText('A');
        await expect(page.locator('.modal.is-active')).toBeVisible();
    });
});
