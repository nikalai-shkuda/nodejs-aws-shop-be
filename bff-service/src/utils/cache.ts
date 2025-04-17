import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 120 }); // Cache expires after 2 minutes

export function getCachedData(key: string) {
  const cachedData = cache.get(key);

  if (cachedData) {
    return { data: cachedData, fromCache: true };
  }
  return { data: null, fromCache: false };
}

export function setCacheData(key: string, data: any) {
  cache.set(key, data);
}
