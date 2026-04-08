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
		let need = fileNames.length > 0 ? [...fileNames] : null;

		const files: File[] = [];

		tex.on('entry', (header, stream, next) => {
			let index: number = -1;
			if (need !== null) {
				index = fileNames.indexOf(header.name);

				// we don't need this file
				if (index === -1) {
					stream.resume();
					stream.on('end', next);
					return;
				}
			}

			const chunks: Buffer[] = [];
			stream.on('data', (chunk) => chunks.push(chunk));
			stream.on('end', () => {
				files.push({ name: header.name, content: Buffer.concat(chunks).toString() });

				if (need !== null) {
					need = [...fileNames.slice(0, index), ...fileNames.slice(index + 1)];
				}

				// continue if we need everything or we need more
				if (need === null || need.length > 0) {
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

/** One pass: first matching registry manifest (registry.json or jsrepo-manifest.json) plus requested paths. */
export async function extractManifestAndSpecific(
	stream: Stream,
	specificNames: string[]
): Promise<{ manifest: File | null; files: File[] }> {
	return new Promise((res, rej) => {
		const tex = tar.extract();

		let manifest: File | null = null;
		const files: File[] = [];
		const needSpecific = new Set(specificNames);

		const tryEarlyExit = (entryStream: Readable) => {
			if (manifest === null) return false;
			if (specificNames.length > 0 && needSpecific.size > 0) return false;

			res({ manifest, files });
			entryStream.destroy();
			tex.destroy();
			return true;
		};

		tex.on('entry', (header, entryStream, next) => {
			if (header.type !== 'file') {
				entryStream.resume();
				entryStream.on('end', next);
				return;
			}

			const name = header.name;

			if (
				manifest === null &&
				(name === 'registry.json' || name === 'jsrepo-manifest.json')
			) {
				const chunks: Buffer[] = [];
				entryStream.on('data', (chunk) => chunks.push(chunk));
				entryStream.on('end', () => {
					manifest = { name, content: Buffer.concat(chunks).toString() };
					if (!tryEarlyExit(entryStream)) next();
				});
				return;
			}

			if (needSpecific.has(name)) {
				const chunks: Buffer[] = [];
				entryStream.on('data', (chunk) => chunks.push(chunk));
				entryStream.on('end', () => {
					files.push({ name, content: Buffer.concat(chunks).toString() });
					needSpecific.delete(name);
					if (!tryEarlyExit(entryStream)) next();
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
