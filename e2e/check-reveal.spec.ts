import { test, expect, request } from '@playwright/test';

// Valid minimal puzzle for tests
const testPuzzle = {
    version: "http://ipuz.org/v2",
    kind: ["http://ipuz.org/crossword#1"],
    dimensions: { width: 5, height: 5 },
    puzzle: [
        [1, 2, 3, 4, 5],
        [6, 0, 0, 0, '#'],
        [7, 0, '#', 0, 8],
        ['#', 0, 9, 0, 0],
        [10, 0, 0, 0, 0]
    ],
    solution: [
        ['O', 'R', 'B', 'I', 'T'],
        ['R', 'A', 'T', 'E', '#'],
        ['A', 'N', '#', 'G', 'O'],
        ['#', 'G', 'E', 'G', 'S'],
        ['S', 'E', 'T', 'S', 'S']
    ],
    clues: {
        Across: [[1, 'Space path'], [6, 'Speed'], [7, 'Article'], [9, 'Easter item'], [10, 'Groups']],
        Down: [[1, 'Citrus'], [2, 'Range'], [3, 'Wager'], [4, 'Bird sound'], [5, 'Letters']]
    }
};

test.describe('Check and Reveal', () => {
    let puzzleId: string;

    test.beforeAll(async ({ }, testInfo) => {
        const apiContext = await request.newContext({ baseURL: 'http://localhost:3000' });
        const response = await apiContext.post('/api/puzzle', {
            multipart: {
                puzzle: {
                    name: 'test.ipuz',
                    mimeType: 'application/json',
                    buffer: Buffer.from(JSON.stringify(testPuzzle)),
                }
            }
        });
        const data = await response.json();
        puzzleId = data.id;
        await apiContext.dispose();
    });

    test.beforeEach(async ({ page }) => {
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
    });

    test('Check button marks incorrect cells', async ({ page }) => {
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('X');
        await page.getByRole('button', { name: /Check/ }).click();
        await expect(page.locator('.cell[data-row="0"][data-col="0"]')).toHaveClass(/is-incorrect/);
    });

    test('Reveal button fills grid with solution', async ({ page }) => {
        await page.evaluate(() => { window.confirm = () => true; });
        await page.getByRole('button', { name: /Reveal/ }).click();
        await expect(page.locator('.cell[data-row="0"][data-col="0"] .cell-value')).toHaveText('O');
        await expect(page.locator('.cell[data-row="0"][data-col="1"] .cell-value')).toHaveText('R');
    });

    test('Completion modal appears when puzzle is solved', async ({ page }) => {
        await page.evaluate(() => { window.confirm = () => true; });
        await page.getByRole('button', { name: /Reveal/ }).click();
        await expect(page.locator('.modal.is-active')).toBeVisible();
        await expect(page.locator('.modal')).toContainText('Congratulations');
    });

    test('Check clears incorrect state when user edits cell', async ({ page }) => {
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('X');
        await page.getByRole('button', { name: /Check/ }).click();
        await expect(page.locator('.cell[data-row="0"][data-col="0"]')).toHaveClass(/is-incorrect/);
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('O');
        await expect(page.locator('.cell[data-row="0"][data-col="0"]')).not.toHaveClass(/is-incorrect/);
    });
});
