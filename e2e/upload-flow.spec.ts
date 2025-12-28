import { test, expect } from '@playwright/test';

test.describe('Upload Flow', () => {
    test('upload puzzle and redirect to play', async ({ page }) => {
        // Navigate to home (upload page)
        await page.goto('/');

        // Verify upload zone is visible
        await expect(page.locator('.upload-zone')).toBeVisible();
        await expect(page.locator('text=Upload a Puzzle')).toBeVisible();

        // Create a valid puzzle file
        const puzzle = {
            version: "http://ipuz.org/v2",
            kind: ["http://ipuz.org/crossword#1"],
            dimensions: { width: 3, height: 3 },
            puzzle: [[1, 2, 3], [4, 0, 0], [5, 0, 0]],
            solution: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']],
            clues: {
                Across: [[1, 'First'], [4, 'Second'], [5, 'Third']],
                Down: [[1, 'D1'], [2, 'D2'], [3, 'D3']]
            }
        };

        // Create file and upload via file input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test.ipuz',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(puzzle))
        });

        // Wait for redirect to puzzle page (with longer timeout for upload)
        await expect(page).toHaveURL(/#puzzle\/[a-f0-9-]+/, { timeout: 10000 });

        // Verify grid is rendered
        await expect(page.locator('.crossword-grid')).toBeVisible();

        // Verify Check and Reveal buttons are present
        await expect(page.getByRole('button', { name: /Check/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /Reveal/ })).toBeVisible();
    });
});
