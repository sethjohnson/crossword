import { test, expect } from '@playwright/test';

test.describe('Static Grid Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('renders the puzzle title and author', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: 'Crossword' })).toBeVisible();
        await expect(page.getByText('New York Times, Monday, December 23, 2024')).toBeVisible();
        await expect(page.getByText('By Glenn Cook')).toBeVisible();
    });

    test('renders the 15x15 grid', async ({ page }) => {
        // Grid container is present
        const grid = page.locator('.crossword-grid');
        await expect(grid).toBeVisible();

        // Check cells exist
        const cells = grid.locator('.cell');
        await expect(cells).toHaveCount(225); // 15 * 15

        // Check black squares (blocks)
        const blocks = grid.locator('.cell.is-block');
        // In this puzzle, there are 38 black squares (I counted from ipuz manually or just verify some exist)
        // Row 1 (index 0) has block at index 4
        await expect(grid.locator('.cell[data-row="0"][data-col="4"]')).toHaveClass(/is-block/);
    });

    test('renders grid numbers', async ({ page }) => {
        // 1-Across starts at 0,0
        const firstCell = page.locator('.cell[data-row="0"][data-col="0"]');
        await expect(firstCell.locator('.clue-number')).toHaveText('1');

        // 5-Across starts at 0,5
        const distinctCell = page.locator('.cell[data-row="0"][data-col="5"]');
        await expect(distinctCell.locator('.clue-number')).toHaveText('5');
    });

    test('renders clues in two lists', async ({ page }) => {
        const acrossHeader = page.getByRole('heading', { name: 'Across' });
        const downHeader = page.getByRole('heading', { name: 'Down' });

        await expect(acrossHeader).toBeVisible();
        await expect(downHeader).toBeVisible();

        // Verify specific clue text
        await expect(page.getByText('1 Christmas baubles, often')).toBeVisible();
        await expect(page.getByText('1 Gives the green light')).toBeVisible();
    });

    test('layout adapts to mobile view', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });

        // Grid should still be visible
        await expect(page.locator('.crossword-grid')).toBeVisible();

        // Clues should stack (check visibility, exact layout depends on CSS which is harder to assert strictly without screenshot)
        await expect(page.getByRole('heading', { name: 'Across' })).toBeVisible();
    });
});
