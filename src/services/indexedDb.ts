/**
 * Native IndexedDB Service for CareShift
 * Provides large-scale persistent storage (hundreds of MBs) without localStorage quota limits.
 */

import { EducationArticle } from '../types';

const DB_NAME = 'CareShiftAppDB';
const DB_VERSION = 1;
const STORE_EDUCATION = 'education_articles';
const STORE_MEDIA = 'media_cache';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_EDUCATION)) {
        db.createObjectStore(STORE_EDUCATION, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save all education articles into IndexedDB
 */
export async function saveEducationArticlesIDB(
  articles: EducationArticle[]
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EDUCATION, 'readwrite');
      const store = tx.objectStore(STORE_EDUCATION);

      // Clear existing records in store to maintain consistency
      store.clear();

      articles.forEach((art) => {
        store.put(art);
      });

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        console.warn('[IndexedDB] Transaction error saving education:', tx.error);
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not open database:', err);
    return false;
  }
}

/**
 * Get all education articles from IndexedDB
 */
export async function getEducationArticlesIDB(): Promise<EducationArticle[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EDUCATION, 'readonly');
      const store = tx.objectStore(STORE_EDUCATION);
      const req = store.getAll();

      req.onsuccess = () => {
        db.close();
        const results = req.result as EducationArticle[];
        if (results && Array.isArray(results) && results.length > 0) {
          resolve(results);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        console.warn('[IndexedDB] Error fetching education articles:', req.error);
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not open database for read:', err);
    return null;
  }
}

/**
 * Save large individual media item to IndexedDB
 */
export async function saveMediaItemToIDB(
  mediaId: string,
  dataUrl: string
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      store.put(dataUrl, mediaId);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Get individual media item from IndexedDB
 */
export async function getMediaItemFromIDB(
  mediaId: string
): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.get(mediaId);

      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
