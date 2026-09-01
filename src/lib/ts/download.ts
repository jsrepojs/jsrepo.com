/**
 * Starts a file download from the browser without exposing the URL in the document.
 *
 * Registry pages used to render download links as plain anchors which crawlers that ignore
 * robots.txt follow for every block on every page. Building the URL on click keeps it out of the
 * HTML so there is nothing to crawl.
 */
export function downloadFile(url: string, fileName: string) {
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = fileName;
	anchor.rel = 'noopener';
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
}
