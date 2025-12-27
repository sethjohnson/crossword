import { describe, it, expect } from 'vitest';
import { VERSION, z } from './index';

describe('shared package', () => {
    it('exports VERSION', () => {
        expect(VERSION).toBe('0.0.1');
    });

    it('re-exports zod', () => {
        expect(z).toBeDefined();
        expect(z.string).toBeDefined();
    });
});
