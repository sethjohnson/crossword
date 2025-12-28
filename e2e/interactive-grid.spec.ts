import { test, expect } from '@playwright/test';

test.describe('Interactive Grid', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for grid to be ready
        await expect(page.locator('.crossword-grid')).toBeVisible();
    });

    test('clicking a cell selects it', async ({ page }) => {
        const cell = page.locator('.cell[data-row="0"][data-col="0"]');
        await cell.click();

        // Should have selected class
        await expect(cell).toHaveClass(/is-selected/);
    });

    test('clicking same cell toggles direction', async ({ page }) => {
        const cell = page.locator('.cell[data-row="0"][data-col="0"]');

        // First click - selects cell
        await cell.click();
        await expect(cell).toHaveClass(/is-selected/);

        // Get initial word highlight count
        const initialHighlighted = await page.locator('.cell.is-highlighted').count();

        // Second click - toggles direction
        await cell.click();

        // Word highlight should change (different direction = different cells)
        const newHighlighted = await page.locator('.cell.is-highlighted').count();
        // Direction toggle should change highlighted cells (1-Across vs 1-Down)
        expect(newHighlighted).not.toBe(initialHighlighted);
    });

    test('typing a letter fills the cell and advances', async ({ page }) => {
        const firstCell = page.locator('.cell[data-row="0"][data-col="0"]');

        // Click to select first cell (this also focuses it)
        await firstCell.click();

        // Type a letter directly - cell button is already focused
        await page.keyboard.press('A');

        // First cell should show 'A'
        await expect(firstCell.locator('.cell-value')).toHaveText('A');

        // Selection should have moved to next cell
        const secondCell = page.locator('.cell[data-row="0"][data-col="1"]');
        await expect(secondCell).toHaveClass(/is-selected/);
    });

    test('arrow keys navigate the grid', async ({ page }) => {
        // Select a cell
        await page.locator('.cell[data-row="1"][data-col="0"]').click();

        // Press right arrow
        await page.keyboard.press('ArrowRight');

        // Should move to next cell
        await expect(
            page.locator('.cell[data-row="1"][data-col="1"]')
        ).toHaveClass(/is-selected/);

        // Press down arrow
        await page.keyboard.press('ArrowDown');

        // Should move down
        await expect(
            page.locator('.cell[data-row="2"][data-col="1"]')
        ).toHaveClass(/is-selected/);
    });

    test('Tab key toggles direction', async ({ page }) => {
        const cell = page.locator('.cell[data-row="2"][data-col="0"]');

        await cell.click();

        // Count highlighted cells in initial direction
        const initialCount = await page.locator('.cell.is-highlighted').count();

        // Press Tab to toggle direction
        await page.keyboard.press('Tab');

        // Highlighted cells should change
        const newCount = await page.locator('.cell.is-highlighted').count();
        expect(newCount).not.toBe(initialCount);
    });

    test('Backspace clears cell', async ({ page }) => {
        const firstCell = page.locator('.cell[data-row="0"][data-col="0"]');

        // Select and type
        await firstCell.click();
        await page.keyboard.press('X');

        // Verify letter is there
        await expect(firstCell.locator('.cell-value')).toHaveText('X');

        // Go back to first cell (currently on second cell after typing)
        await page.keyboard.press('ArrowLeft');

        // Clear with backspace
        await page.keyboard.press('Backspace');

        // Cell should be empty
        await expect(firstCell.locator('.cell-value')).toHaveText('');
    });

    test('clicking a clue selects corresponding cell', async ({ page }) => {
        // Click on clue 5 Across
        const clue5 = page.getByRole('button', { name: /5.*Ontario-based/ });
        await clue5.click();

        // Cell 0,5 should be selected (5-Across starts there)
        await expect(
            page.locator('.cell[data-row="0"][data-col="5"]')
        ).toHaveClass(/is-selected/);
    });

    test('active clue is highlighted', async ({ page }) => {
        // Click cell that belongs to 1-Across
        await page.locator('.cell[data-row="0"][data-col="0"]').click();

        // Clue 1 Across should be active
        const clue1 = page.locator('.clue.is-active').first();
        await expect(clue1).toContainText('1');
        await expect(clue1).toContainText('Christmas baubles');
    });
});
