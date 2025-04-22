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
import { createHighlighter } from 'shiki';

export const prettyCodeOptions: Options = {
	theme: {
		dark: 'github-dark-default',
		light: 'github-light-default'
	},
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
				import('shiki/langs/yaml.mjs')
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

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeExternalLinks, { target: '_blank' })
	.use(rehypeAutolinkHeadings)
	.use(rehypePrettyCode, prettyCodeOptions)
	.use(rehypeStringify);

export async function rehype(md: string) {
	return processor.process(md);
}
