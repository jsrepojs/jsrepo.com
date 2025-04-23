import { UPSTASH_REDIS_TOKEN, UPSTASH_REDIS_URL } from '$env/static/private';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const redis = new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN });

/** Limits the user to 5 requests per 24 hours */
export const supportFormRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '24 h'),
    analytics: true,

    prefix: 'ratelimit-support-form',
})
