import { getRedis } from "@/lib/redis";

const CACHE_TTL_SECONDS = 60;

export const cacheKeys = {
  meetings: (userId: string, query: string) =>
    `cache:meetings:${userId}:${query || "default"}`,
  actionItems: (userId: string, query: string) =>
    `cache:action-items:${userId}:${query || "default"}`,
  meetingsPattern: (userId: string) => `cache:meetings:${userId}:*`,
  actionItemsPattern: (userId: string) => `cache:action-items:${userId}:*`,
};

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    return await getRedis().get<T>(key);
  } catch (err) {
    console.warn("Redis cache read skipped:", err);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await getRedis().set(key, data, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn("Redis cache write skipped:", err);
  }
}

async function invalidatePattern(pattern: string): Promise<void> {
  let keys: string[];

  try {
    keys = await getRedis().keys(pattern);
  } catch (err) {
    console.warn("Redis cache invalidation skipped:", err);
    return;
  }

  if (keys.length > 0) {
    try {
      await getRedis().del(...keys);
    } catch (err) {
      console.warn("Redis cache deletion skipped:", err);
    }
  }
}

export async function invalidateMeetingCaches(userId: string): Promise<void> {
  await invalidatePattern(cacheKeys.meetingsPattern(userId));
}

export async function invalidateActionItemCaches(userId: string): Promise<void> {
  await invalidatePattern(cacheKeys.actionItemsPattern(userId));
}

export async function invalidateUserReadCaches(userId: string): Promise<void> {
  await Promise.all([
    invalidateMeetingCaches(userId),
    invalidateActionItemCaches(userId),
  ]);
}
