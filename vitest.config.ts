import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: {
                'packages/shared/src/**': {
                    lines: 80,
                    functions: 80,
                    branches: 80,
                    statements: 80,
                },
            },
            include: ['packages/shared/src/**'],
            exclude: [
                'node_modules/**',
                '**/dist/**',
                '**/*.config.*',
                '**/e2e/**',
                '**/*.test.ts',
                '**/*.spec.ts',
            ],
        },
        include: ['packages/**/*.test.ts'],
    },
});
