import { createClient } from "redis";

export function makeRedisClient(redisUrl) {
  if (!redisUrl) throw new Error("REDIS_URL is missing");
  const client = createClient({ url: redisUrl });
  return client;
}

