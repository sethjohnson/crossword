// Polyfill for crypto.randomUUID in non-secure contexts (HTTP)
// Required because crypto.randomUUID only works in secure contexts (HTTPS)
if (typeof crypto.randomUUID !== 'function') {
    crypto.randomUUID = function (): `${string}-${string}-${string}-${string}-${string}` {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        ) as `${string}-${string}-${string}-${string}-${string}`;
    };
}

import { mount } from 'svelte';
import App from './App.svelte';
import 'bulma/css/bulma.min.css';

const app = mount(App, {
    target: document.getElementById('app')!,
});

export default app;
