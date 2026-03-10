import { getAllRecords, getRecord, putRecord } from '@/lib/offline/indexed-db';
import type { CachedExamRecord, CachedSchoolsRecord, OfflineCacheManifest } from '@/lib/offline/types';

const SCHOOLS_KEY = 'schools' as const;

export async function saveOfflineManifest(manifest: OfflineCacheManifest) {
  const downloadedAt = new Date().toISOString();

  await putRecord('cachedSchools', {
    key: SCHOOLS_KEY,
    version: manifest.generatedAt,
    downloadedAt,
    schools: manifest.schools,
    expectedExamIds: manifest.exams.map((exam) => exam.id),
  });

  await Promise.all(
    manifest.exams.map((exam) =>
      putRecord('cachedExams', {
        examId: exam.id,
        version: exam.updatedAt,
        downloadedAt,
        payload: exam,
      })
    )
  );
}

export async function saveCachedExamPayload(examId: string, version: string, payload: unknown) {
  await putRecord('cachedExams', {
    examId,
    version,
    downloadedAt: new Date().toISOString(),
    payload,
  });
}

export function getCachedSchools() {
  return getRecord('cachedSchools', SCHOOLS_KEY) as Promise<CachedSchoolsRecord | undefined>;
}

export function getCachedExam(examId: string) {
  return getRecord('cachedExams', examId) as Promise<CachedExamRecord | undefined>;
}

export function getAllCachedExams() {
  return getAllRecords('cachedExams') as Promise<CachedExamRecord[]>;
}
