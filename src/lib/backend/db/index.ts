import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

const client = postgres(DATABASE_URL, { prepare: false, max: 10, idle_timeout: 10, max_lifetime: 60 * 15 });
export const db = drizzle(client);
