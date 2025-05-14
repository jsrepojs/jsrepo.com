import {
	STORAGE_ACCESS_KEY_ID,
	STORAGE_BUCKET_URL,
	STORAGE_SECRET_ACCESS_KEY
} from '$env/static/private';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
	region: 'auto',
	endpoint: STORAGE_BUCKET_URL,
	credentials: {
		accessKeyId: STORAGE_ACCESS_KEY_ID,
		secretAccessKey: STORAGE_SECRET_ACCESS_KEY
	}
});

export const storage = {
	client: s3Client,
	getStorageUrl: (key: string) => {
		return new URL(key, STORAGE_BUCKET_URL).toString();
	},
	getRegistryFileKey: ({
		scope,
		registry,
		version,
		fileName
	}: {
		scope: string;
		registry: string;
		version: string;
		fileName: string;
	}) => {
		return `registries/@${scope}/${registry}/v/${version}/files/${fileName}`;
	}
};
