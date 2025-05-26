
import {  redis, ActiveUsers } from "./app.js";

/**
 * Sets a key-value pair in Redis and updates the local ActiveUsers map.
 * 
 * @param {string} key - The Redis key.
 * @param {string} value - The value to store.
 */
export async function setRedisKey(key: string, value: string) {
  try {
    ActiveUsers.set(key, value);
    await redis?.set(key, value);
  } catch {
    // Handle error silently
  }
}

/**
 * Retrieves a value from Redis by key.
 * Falls back to local ActiveUsers map if Redis access fails.
 * 
 * @param {string} key - The Redis key.
 * @returns {Promise<string | null>} The stored value or null if not found.
 */
export async function getRedisValue(key: string): Promise<string | null> {
  try {
    return await redis?.get(key)||null;
  } catch {
    return ActiveUsers.get(key) || null;
  }
}

/**
 * Deletes a key from Redis and removes it from the local ActiveUsers map.
 * 
 * @param {string} key - The Redis key to delete.
 */
export async function deleteRedisKey(key: string) {
  try {
    ActiveUsers.delete(key);
    await redis?.del(key);
  } catch {
    // Handle error silently
  }
}

