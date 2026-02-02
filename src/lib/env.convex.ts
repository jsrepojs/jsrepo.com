import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
    server: {
        // auth
        BETTER_AUTH_SECRET: z.string(),
        GITHUB_CLIENT_ID: z.string(),
        GITHUB_CLIENT_SECRET: z.string(),

        // r2
        R2_TOKEN: z.string(),
        R2_ACCESS_KEY_ID: z.string(),
        R2_SECRET_ACCESS_KEY: z.string(),
        R2_ENDPOINT: z.url(),
        R2_BUCKET: z.string(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: process.env
});
