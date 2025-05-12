import { rehype } from '$lib/ts/markdown.js';

export async function load({ fetch }) {
    const tos = await (await fetch('/tos.md')).text();

    const html = await rehype(tos);

    return {
        tos: html.toString() 
    }
}