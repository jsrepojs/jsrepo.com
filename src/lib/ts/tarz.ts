import { Readable } from 'stream';
import tarS from 'tar-stream';
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

		const extract = tarS.extract();

		const extractionPromise = new Promise<void>((res, rej) => {
			extract.on('entry', (header, stream, next) => {
				let content = '';

				stream.on('data', (chunk) => {
					content += chunk.toString();
				});

				stream.on('end', () => {
					files.push({ name: header.name, content });

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
