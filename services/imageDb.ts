
// IndexedDB wrapper to store large image data (Base64)
// allowing localStorage to only keep lightweight references (IDs)

const DB_NAME = 'GeminiImageDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveImageToDB = async (base64Data: string): Promise<string> => {
  // If it's already an ID (starts with 'img_'), just return it
  if (base64Data.startsWith('img_')) return base64Data;

  const db = await openDB();
  const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ id, data: base64Data });

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};

export const getImageFromDB = async (id: string): Promise<string | null> => {
  if (!id.startsWith('img_')) return id; // Return as is if it's not an ID (backward compatibility)

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        console.warn(`Image not found in DB: ${id}`);
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};
