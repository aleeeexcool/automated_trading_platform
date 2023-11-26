import { createClient } from "redis";
import { logger } from "./logger";

export const CacheHelper = (() => {
  const CacheImpl = () => {
    const { REDIS_HOST, REDIS_PORT } = process.env;
    const options =
      REDIS_HOST && REDIS_PORT
        ? {
            url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
          }
        : {};
    const redisClient = createClient(options);
    redisClient.connect().then(() => {
      redisClient.on("error", (err: any) =>
        logger.error(`Redis client error: ${err}`),
      );
    });
    const set = async <T>(key: string, value: T, ttl = 3600) => {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttl,
      });
    };

    const get = async <T>(key: string) => {
      const res = await redisClient.get(key);
      const parsedResult: T | null = res ? JSON.parse(res) : null;
      return parsedResult;
    };

    return {
      set,
      get,
    };
  };
  // TODO: continue with instance
  // let instance;
})();

