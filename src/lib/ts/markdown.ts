import { unified } from 'unified';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode, { type Options } from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeRaw from 'rehype-raw';
import { createCssVariablesTheme, createHighlighter } from 'shiki';

/**
 * A single theme whose colors are CSS custom properties (see `--shiki-*` in markdown.css).
 *
 * Highlighting with two concrete themes tokenizes every code block twice and doubles the amount
 * of inline style on every token. One variable based theme halves both, and light/dark is decided
 * by the stylesheet instead.
 */
export const cssVariablesTheme = createCssVariablesTheme({
	name: 'css-variables',
	variablePrefix: '--shiki-',
	variableDefaults: {},
	fontStyle: true
});

/** Code blocks longer than this are rendered without syntax highlighting */
export const MAX_HIGHLIGHTED_LINES_PER_BLOCK = 400;
/** Once a document has this many highlighted lines the remaining blocks are rendered plain */
export const MAX_HIGHLIGHTED_LINES_PER_DOCUMENT = 2000;

export const prettyCodeOptions: Options = {
	// rehype-pretty-code types the option as a raw registration; shiki accepts the resolved form at runtime
	theme: cssVariablesTheme as unknown as Options['theme'],
	getHighlighter: (options) =>
		createHighlighter({
			...options,
			langs: [
				'plaintext',
				import('shiki/langs/javascript.mjs'),
				import('shiki/langs/typescript.mjs'),
				import('shiki/langs/svelte.mjs'),
				import('shiki/langs/vue.mjs'),
				import('shiki/langs/sh.mjs'),
				import('shiki/langs/jsonc.mjs'),
				import('shiki/langs/json.mjs'),
				import('shiki/langs/yaml.mjs'),
				import('shiki/langs/diff.mjs')
			]
		}),
	keepBackground: false,
	onVisitLine(node) {
		// Prevent lines from collapsing in `display: grid` mode, and allow empty
		// lines to be copy/pasted
		if (node.children.length === 0) {
			node.children = [{ type: 'text', value: ' ' }];
		}
	},
	onVisitHighlightedLine(node) {
		node.properties.className = ['line--highlighted'];
	},
	onVisitHighlightedChars(node) {
		node.properties.className = ['chars--highlighted'];
	}
};

type HastNode = {
	type: string;
	tagName?: string;
	value?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
};

function textOf(node: HastNode): string {
	if (node.type === 'text') return node.value ?? '';
	return (node.children ?? []).map(textOf).join('');
}

function countLines(text: string): number {
	if (text.length === 0) return 0;
	let lines = 1;
	for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lines++;
	if (text.endsWith('\n')) lines--;
	return lines;
}

/**
 * Highlighting costs a few milliseconds per line and produces an order of magnitude more html than
 * the source, so very long code blocks (and documents made of many of them) are rendered as plain
 * text past a budget. Runs before rehype-pretty-code and works by swapping the language class.
 */
function rehypeCapHighlighting() {
	return (tree: HastNode) => {
		let highlighted = 0;

		const visit = (node: HastNode) => {
			if (node.type === 'element' && node.tagName === 'pre') {
				const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');

				if (code) {
					const lines = countLines(textOf(code));

					if (
						lines > MAX_HIGHLIGHTED_LINES_PER_BLOCK ||
						highlighted + lines > MAX_HIGHLIGHTED_LINES_PER_DOCUMENT
					) {
						code.properties = { ...code.properties, className: ['language-plaintext'] };
					} else {
						highlighted += lines;
					}
				}

				return;
			}

			for (const child of node.children ?? []) visit(child);
		};

		visit(tree);
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeExternalLinks, { target: '_blank' })
	.use(rehypeAutolinkHeadings)
	.use(rehypeCapHighlighting)
	.use(rehypePrettyCode, prettyCodeOptions)
	.use(rehypeStringify);

export async function rehype(md: string) {
	return processor.process(md);
}
