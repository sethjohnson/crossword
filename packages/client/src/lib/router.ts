import { writable, derived } from 'svelte/store';

export interface Route {
    path: string;
    puzzleId: string | null;
}

function parseHash(): Route {
    const hash = window.location.hash.slice(1); // Remove #

    // Match #puzzle/:id
    const puzzleMatch = hash.match(/^puzzle\/([a-zA-Z0-9-]+)$/);
    if (puzzleMatch) {
        return { path: 'puzzle', puzzleId: puzzleMatch[1] };
    }

    // Default to upload page
    return { path: 'upload', puzzleId: null };
}

function createRouter() {
    const { subscribe, set } = writable<Route>(parseHash());

    // Listen for hash changes
    if (typeof window !== 'undefined') {
        window.addEventListener('hashchange', () => {
            set(parseHash());
        });
    }

    return {
        subscribe,
        navigate(path: string) {
            window.location.hash = path;
        }
    };
}

export const router = createRouter();

// Derived store for easy access to puzzle ID
export const currentPuzzleId = derived(router, ($route) => $route.puzzleId);
