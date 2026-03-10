import type {
  CachedExamRecord,
  CachedSchoolsRecord,
  OfflineAnswerRecord,
  OfflineAttemptRecord,
  SyncQueueJob,
} from '@/lib/offline/types';

const DB_NAME = 'jupa-offline';
const DB_VERSION = 1;

type StoreMap = {
  cachedExams: CachedExamRecord;
  cachedSchools: CachedSchoolsRecord;
  offlineAttempts: OfflineAttemptRecord;
  offlineAnswers: OfflineAnswerRecord;
  syncQueue: SyncQueueJob;
};

type StoreName = keyof StoreMap;

function getKeyPath(storeName: StoreName) {
  switch (storeName) {
    case 'cachedExams':
      return 'examId';
    case 'cachedSchools':
      return 'key';
    case 'offlineAttempts':
      return 'offlineAttemptId';
    case 'offlineAnswers':
      return ['offlineAttemptId', 'questionId'];
    case 'syncQueue':
      return 'id';
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('cachedExams')) {
        db.createObjectStore('cachedExams', { keyPath: getKeyPath('cachedExams') });
      }

      if (!db.objectStoreNames.contains('cachedSchools')) {
        db.createObjectStore('cachedSchools', { keyPath: getKeyPath('cachedSchools') });
      }

      if (!db.objectStoreNames.contains('offlineAttempts')) {
        db.createObjectStore('offlineAttempts', { keyPath: getKeyPath('offlineAttempts') });
      }

      if (!db.objectStoreNames.contains('offlineAnswers')) {
        const answersStore = db.createObjectStore('offlineAnswers', { keyPath: getKeyPath('offlineAnswers') });
        answersStore.createIndex('byAttempt', 'offlineAttemptId', { unique: false });
      }

      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: getKeyPath('syncQueue') });
        queueStore.createIndex('byAttempt', 'offlineAttemptId', { unique: false });
        queueStore.createIndex('byStatus', 'status', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord<TStoreName extends StoreName>(
  storeName: TStoreName,
  value: StoreMap[TStoreName],
) {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function getRecord<TStoreName extends StoreName>(
  storeName: TStoreName,
  key: IDBValidKey | IDBKeyRange,
): Promise<StoreMap[TStoreName] | undefined> {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    return await requestToPromise(request) as StoreMap[TStoreName] | undefined;
  } finally {
    db.close();
  }
}

export async function getAllRecords<TStoreName extends StoreName>(
  storeName: TStoreName,
): Promise<Array<StoreMap[TStoreName]>> {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    return await requestToPromise(request) as Array<StoreMap[TStoreName]>;
  } finally {
    db.close();
  }
}

export async function deleteRecord(storeName: StoreName, key: IDBValidKey | IDBKeyRange) {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function clearStore(storeName: StoreName) {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function getAnswersForAttempt(offlineAttemptId: string) {
  const db = await openDatabase();

  try {
    const transaction = db.transaction('offlineAnswers', 'readonly');
    const index = transaction.objectStore('offlineAnswers').index('byAttempt');
    const request = index.getAll(offlineAttemptId);
    return await requestToPromise(request) as OfflineAnswerRecord[];
  } finally {
    db.close();
  }
}

export async function getQueueJobsByStatus(status: SyncQueueJob['status']) {
  const db = await openDatabase();

  try {
    const transaction = db.transaction('syncQueue', 'readonly');
    const index = transaction.objectStore('syncQueue').index('byStatus');
    const request = index.getAll(status);
    return await requestToPromise(request) as SyncQueueJob[];
  } finally {
    db.close();
  }
}
