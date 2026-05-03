/**
 * thumbCache.ts
 * IndexedDB-backed thumbnail cache.
 * - Stores base64 data-URLs keyed by `${message_id}:${channel_id}`
 * - Caps storage at MAX_ENTRIES (oldest-first eviction via `accessed` timestamp)
 * - Non-blocking: falls back gracefully if IDB is unavailable
 */

const DB_NAME = 'teledrive-thumbs'
const STORE = 'thumbnails'
const DB_VERSION = 1
const MAX_ENTRIES = 2000 // ~200 MB estimate at ~100 KB each

interface CacheEntry {
  key: string
  url: string
  accessed: number
}

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex('accessed', 'accessed')
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => {
        const entry: CacheEntry | undefined = req.result
        if (!entry) { resolve(null); return }
        // Touch access time
        tx.objectStore(STORE).put({ ...entry, accessed: Date.now() })
        resolve(entry.url)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function cacheSet(key: string, url: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ key, url, accessed: Date.now() })
    // Evict if over limit (fire-and-forget)
    evictIfNeeded(db)
  } catch {
    // ignore
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  try {
    const count = await new Promise<number>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    if (count <= MAX_ENTRIES) return

    // Get oldest entries by `accessed` index
    const toDelete = count - MAX_ENTRIES
    const tx = db.transaction(STORE, 'readwrite')
    const idx = tx.objectStore(STORE).index('accessed')
    const cursorReq = idx.openCursor()
    let deleted = 0
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null
      if (!cursor || deleted >= toDelete) return
      cursor.delete()
      deleted++
      cursor.continue()
    }
  } catch {
    // ignore
  }
}

/** Wipe the entire thumbnail cache (e.g. on logout or manual clear) */
export async function cacheClear(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch {
    // ignore
  }
}

/** Approximate cache size in entries */
export async function cacheSize(): Promise<number> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(0)
    })
  } catch {
    return 0
  }
}
