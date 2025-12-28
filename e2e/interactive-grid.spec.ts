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

// Helper to upload puzzle and get ID
async function uploadPuzzle(): Promise<string> {
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
    await apiContext.dispose();
    return data.id;
}

test.describe('Interactive Grid', () => {
    test('clicking a cell selects it', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        const cell = page.locator('.cell[data-row="0"][data-col="0"]');
        await cell.click();
        await expect(cell).toHaveClass(/is-selected/);
    });

    test('clicking same cell toggles direction', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        const cell = page.locator('.cell[data-row="0"][data-col="0"]');
        await cell.click();
        await expect(cell).toHaveClass(/is-selected/);
        await cell.click();
        await expect(cell).toHaveClass(/is-selected/);
    });

    test('typing a letter fills the cell and advances', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        const firstCell = page.locator('.cell[data-row="0"][data-col="0"]');
        await firstCell.click();
        await page.keyboard.press('A');
        await expect(firstCell.locator('.cell-value')).toHaveText('A');
        const secondCell = page.locator('.cell[data-row="0"][data-col="1"]');
        await expect(secondCell).toHaveClass(/is-selected/);
    });

    test('arrow keys navigate the grid', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('.cell[data-row="0"][data-col="1"]')).toHaveClass(/is-selected/);
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.cell[data-row="1"][data-col="1"]')).toHaveClass(/is-selected/);
    });

    test('Tab key toggles direction', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await page.keyboard.press('Tab');
        await expect(page.locator('.cell[data-row="0"][data-col="0"]')).toHaveClass(/is-selected/);
    });

    test('Backspace clears cell', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        const firstCell = page.locator('.cell[data-row="0"][data-col="0"]');
        await firstCell.click();
        await page.keyboard.press('X');
        await expect(firstCell.locator('.cell-value')).toHaveText('X');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Backspace');
        await expect(firstCell.locator('.cell-value')).toHaveText('');
    });

    test('clicking a clue selects corresponding cell', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        const clue = page.locator('.clue-item').first();
        await clue.click();
        await expect(page.locator('.cell.is-selected')).toBeVisible();
    });

    test('active clue is highlighted', async ({ page }) => {
        const puzzleId = await uploadPuzzle();
        await page.goto(`/#puzzle/${puzzleId}`);
        await expect(page.locator('.crossword-grid')).toBeVisible();
        await page.locator('.cell[data-row="0"][data-col="0"]').click();
        await expect(page.locator('.clue-item.is-active')).toBeVisible();
    });
});
