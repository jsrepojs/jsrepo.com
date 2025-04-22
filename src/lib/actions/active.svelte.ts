/*
	Installed from github/ieedan/shadcn-svelte-extras
*/

import { page } from '$app/state';
import { untrack } from 'svelte';

export type Options = {
	/** Determines if the route should be active for subdirectories.
	 *
	 * @default true
	 */
	activeForSubdirectories?: boolean;
	/** Determines if the href of the `<a/>` tag is a `#` route
	 *
	 *  @default false
	 */
	isHash?: boolean;
	/** Determines if the href of the `<a/>` tag is a search
	 *
	 *  @default false
	 */
	isSearch?: boolean;
	url: URL;
};

/** Sets the `data-active` attribute on an `<a/>` tag based on its 'active' state. */
export const active = (node: HTMLAnchorElement, opts: Omit<Options, 'url'>) => {
	checkIsActive(node.href, { ...opts, url: page.url }).toString();

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		page.url;

		untrack(() => {
			node.setAttribute(
				'data-active',
				checkIsActive(node.href, { ...opts, url: page.url }).toString()
			);
		});
	});
};

export const checkIsActive = (
	nodeHref: string,
	{ activeForSubdirectories, url, isHash, isSearch }: Options
): boolean => {
	let href: string = new URL(nodeHref).pathname;

	if (isHash) {
		href = new URL(nodeHref).hash;
	}

	let searchParamName: string | undefined = undefined;
	let searchParamValue: string | undefined = undefined;

	if (isSearch) {
		const tempUrl = new URL(nodeHref);

		for (const [key, value] of tempUrl.searchParams.entries()) {
			searchParamName = key;
			searchParamValue = value;
		}

		href = new URL(nodeHref).search;
	}

	const samePath = href === url.pathname;

	const isParentRoute: boolean =
		(activeForSubdirectories == undefined || activeForSubdirectories) &&
		url.pathname.startsWith(href ?? '');

	const isHashRoute: boolean =
		isHash == true && (url.hash == href || ((href == '#' || href == '#/') && url.hash == ''));

	const isSearchRoute: boolean =
		isSearch === true &&
		searchParamName !== undefined &&
		searchParamValue !== undefined &&
		(url.searchParams.get(searchParamName) ?? '/') === searchParamValue;

	return samePath || isParentRoute || isHashRoute || isSearchRoute;
};
