import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError, InternalError } from "@/types/errors";

// Singleton Redis instance
// Upstash Redis is HTTP-based — safe for Vercel serverless (no persistent connections)
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new InternalError(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"
      );
    }

    _redis = new Redis({ url, token });
  }
  return _redis;
}

// Two limiters with different scopes and limits.
// Sliding window: fairer than fixed window — prevents burst abuse at window boundary.

// Per-user: 10 analyze calls per hour across all their meetings
const getUserLimiter = () =>
  new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:analyze:user",
    analytics: true, // visible in Upstash dashboard
  });

// Per-meeting: 3 analyze calls per hour on the same meeting
const getMeetingLimiter = () =>
  new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:analyze:meeting",
    analytics: true,
  });

/**
 * Runs both rate limit checks for the analyze endpoint.
 * Per-user checked first — if that fails, no point checking per-meeting.
 *
 * Throws 429 AppError with retryAfter details if either limit is exceeded.
 */
export async function checkAnalyzeRateLimit(
  userId: string,
  meetingId: string
): Promise<void> {
  // Check 1: per-user global (10 per hour)
  const userResult = await getUserLimiter().limit(userId);

  if (!userResult.success) {
    const retryAfterSeconds = Math.ceil(
      (userResult.reset - Date.now()) / 1000
    );
    throw new AppError(
      `Too many analyze requests. You can make 10 analysis calls per hour. Try again in ${retryAfterSeconds} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      {
        limit: userResult.limit,
        remaining: userResult.remaining,
        retryAfterSeconds,
        resetAt: new Date(userResult.reset).toISOString(),
        scope: "user",
      }
    );
  }

  // Check 2: per-meeting (3 per hour)
  const meetingResult = await getMeetingLimiter().limit(meetingId);

  if (!meetingResult.success) {
    const retryAfterSeconds = Math.ceil(
      (meetingResult.reset - Date.now()) / 1000
    );
    throw new AppError(
      `This meeting has been analyzed too many times. Max 3 analyses per hour per meeting. Try again in ${retryAfterSeconds} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      {
        limit: meetingResult.limit,
        remaining: meetingResult.remaining,
        retryAfterSeconds,
        resetAt: new Date(meetingResult.reset).toISOString(),
        scope: "meeting",
      }
    );
  }
}