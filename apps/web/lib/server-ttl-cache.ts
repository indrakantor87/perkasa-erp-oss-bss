type CacheEntry<T> = {
  expiresAt: number
  value?: T
  promise?: Promise<T>
}

type GlobalCacheStore = {
  __perkasaServerTtlCache?: Map<string, CacheEntry<unknown>>
}

function getCacheStore() {
  const target = globalThis as typeof globalThis & GlobalCacheStore
  if (!target.__perkasaServerTtlCache) {
    target.__perkasaServerTtlCache = new Map()
  }

  return target.__perkasaServerTtlCache
}

export async function readThroughServerTtlCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const store = getCacheStore()
  const now = Date.now()
  const cached = store.get(key) as CacheEntry<T> | undefined

  if (cached?.value !== undefined && cached.expiresAt > now) {
    return cached.value
  }

  if (cached?.promise && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = loader()
    .then((value) => {
      store.set(key, {
        expiresAt: Date.now() + ttlMs,
        value,
      })
      return value
    })
    .catch((error) => {
      const latest = store.get(key) as CacheEntry<T> | undefined
      if (latest?.promise === promise) {
        store.delete(key)
      }
      throw error
    })

  store.set(key, {
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}
