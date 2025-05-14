import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/backend/db/schema.ts',
	dbCredentials: {
		url: process.env.DATABASE_URL_DIRECT!
	}
});
