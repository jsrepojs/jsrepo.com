import Stream, { PassThrough, Readable } from 'stream';
import tar from 'tar-stream';
import { createGunzip } from 'zlib';
import { Err, Ok, type Result } from './result';

type File = {
	name: string;
	content: string;
};

/** Extracts the provided buffer into a list of files */
export async function extract(buffer: Buffer): Promise<Result<File[], string>> {
	try {
		const files: File[] = [];

		const extract = tar.extract();

		const extractionPromise = new Promise<void>((res, rej) => {
			extract.on('entry', (header, stream, next) => {
				let content = '';

				stream.on('data', (chunk) => {
					content += chunk.toString();
				});

				stream.on('end', () => {
					if (header.type === 'file') {
						files.push({ name: header.name, content });
					}

					next();
				});

				stream.resume();
			});

			extract.on('finish', () => res());

			extract.on('error', (err) => rej(err));
		});

		const gunzip = createGunzip();

		const bufferStream = new Readable();
		bufferStream.push(buffer);
		bufferStream.push(null); // Signal the end of the stream

		bufferStream.pipe(gunzip).pipe(extract);

		await extractionPromise;

		return Ok(files);
	} catch (err) {
		return Err(`${err}`);
	}
}

export async function extractSpecific(stream: Stream, ...fileNames: string[]): Promise<File[]> {
	return new Promise<File[]>((res, rej) => {
		const tex = tar.extract();

		/** null means everything */
		const need = fileNames.length > 0 ? new Set(fileNames) : null;

		const files: File[] = [];

		tex.on('entry', (header, stream, next) => {
			// we don't need this file
			if (need !== null && !need.has(header.name)) {
				stream.resume();
				stream.on('end', next);
				return;
			}

			const chunks: Buffer[] = [];
			stream.on('data', (chunk) => chunks.push(chunk));
			stream.on('end', () => {
				files.push({ name: header.name, content: Buffer.concat(chunks).toString() });

				need?.delete(header.name);

				// continue if we need everything or we need more
				if (need === null || need.size > 0) {
					next();
					return;
				}

				// once we have everything we need let's stop streaming and move on
				res(files);

				stream.destroy();
				tex.destroy();
			});
		});

		// return here
		tex.on('finish', () => res(files));

		tex.on('error', rej);

		stream.on('error', rej);

		stream.pipe(createGunzip()).pipe(tex);
	});
}

export async function extractFirstOf(stream: Stream, fileNames: string[]): Promise<File | null> {
	return new Promise<File | null>((res, rej) => {
		const tex = tar.extract();

		tex.on('entry', (header, stream, next) => {
			// we don't need this file
			if (!fileNames.includes(header.name)) {
				stream.resume();
				stream.on('end', next);
				return;
			}

			const chunks: Buffer[] = [];
			stream.on('data', (chunk) => chunks.push(chunk));
			stream.on('end', () => {
				res({ name: header.name, content: Buffer.concat(chunks).toString() });
			});
		});

		tex.on('finish', () => res(null));

		tex.on('error', rej);

		stream.on('error', rej);

		stream.pipe(createGunzip()).pipe(tex);
	});
}

/** Registry manifest file names. `registry.json` is written by jsrepo v3, `jsrepo-manifest.json` by v2. */
export const MANIFEST_FILE_NAMES = ['registry.json', 'jsrepo-manifest.json'] as const;

export type ManifestFileName = (typeof MANIFEST_FILE_NAMES)[number];

export function isManifestFileName(name: string): name is ManifestFileName {
	return (MANIFEST_FILE_NAMES as readonly string[]).includes(name);
}

/** Which version of the registry format a manifest file name belongs to */
export function manifestVersionFromFileName(name: ManifestFileName): 'v2' | 'v3' {
	return name === 'registry.json' ? 'v3' : 'v2';
}

export type ExtractManifestOptions = {
	/**
	 * Called once the manifest has been read. Returns additional file names to collect.
	 *
	 * Entries that stream past before the manifest is reached are buffered so that a single
	 * pass over the tarball is enough regardless of entry order.
	 */
	pickFromManifest?: (manifest: File) => string[];
};

/** One pass: first matching registry manifest (registry.json or jsrepo-manifest.json) plus requested paths. */
export async function extractManifestAndSpecific(
	stream: Stream,
	specificNames: string[],
	{ pickFromManifest }: ExtractManifestOptions = {}
): Promise<{ manifest: File | null; files: File[] }> {
	return new Promise((res, rej) => {
		const tex = tar.extract();

		let manifest: File | null = null;
		const files: File[] = [];
		const needSpecific = new Set(specificNames);
		/** Entries seen before the manifest that may be needed once we know what to pick */
		const pending = pickFromManifest !== undefined ? new Map<string, File>() : null;

		const tryEarlyExit = (entryStream: Readable) => {
			if (manifest === null) return false;
			if (needSpecific.size > 0) return false;

			res({ manifest, files });
			entryStream.destroy();
			tex.destroy();
			return true;
		};

		const readEntry = (entryStream: Readable, onDone: (content: string) => void) => {
			const chunks: Buffer[] = [];
			entryStream.on('data', (chunk) => chunks.push(chunk));
			entryStream.on('end', () => onDone(Buffer.concat(chunks).toString()));
		};

		tex.on('entry', (header, entryStream, next) => {
			if (header.type !== 'file') {
				entryStream.resume();
				entryStream.on('end', next);
				return;
			}

			const name = header.name;

			if (manifest === null && isManifestFileName(name)) {
				readEntry(entryStream, (content) => {
					manifest = { name, content };

					if (pickFromManifest !== undefined) {
						for (const picked of pickFromManifest(manifest)) {
							needSpecific.add(picked);
						}
					}

					// drain anything we buffered while waiting on the manifest
					if (pending !== null) {
						for (const [pendingName, file] of pending) {
							if (needSpecific.delete(pendingName)) files.push(file);
						}
						pending.clear();
					}

					if (!tryEarlyExit(entryStream)) next();
				});
				return;
			}

			if (needSpecific.has(name)) {
				readEntry(entryStream, (content) => {
					files.push({ name, content });
					needSpecific.delete(name);
					if (!tryEarlyExit(entryStream)) next();
				});
				return;
			}

			// we don't know what we need yet so hold on to it
			if (manifest === null && pending !== null) {
				readEntry(entryStream, (content) => {
					pending.set(name, { name, content });
					next();
				});
				return;
			}

			entryStream.resume();
			entryStream.on('end', next);
		});

		tex.on('finish', () => res({ manifest, files }));

		tex.on('error', rej);

		stream.on('error', rej);

		stream.pipe(createGunzip()).pipe(tex);
	});
}

export async function consume(stream: PassThrough): Promise<Buffer<ArrayBuffer>> {
	return new Promise((res, rej) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk) => chunks.push(chunk));

		stream.on('end', () => {
			res(Buffer.concat(chunks));
		});

		stream.on('error', rej);
	});
}

/** Convert a ReadableStream to a buffer */
export async function streamToBuffer(readableStream: ReadableStream<Uint8Array>): Promise<Buffer> {
	const reader = readableStream.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		chunks.push(value);
	}

	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const result = new Uint8Array(totalLength);
	let position = 0;

	for (const chunk of chunks) {
		result.set(chunk, position);
		position += chunk.length;
	}

	return Buffer.from(result);
}
