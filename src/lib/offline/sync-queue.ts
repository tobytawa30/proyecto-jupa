import { v4 as uuidv4 } from 'uuid';
import { deleteRecord, getAllRecords, getQueueJobsByStatus, putRecord } from '@/lib/offline/indexed-db';
import type { SyncQueueJob } from '@/lib/offline/types';

export async function enqueueExamSync(offlineAttemptId: string) {
  const now = new Date().toISOString();
  const jobs = await getAllQueueJobs();
  const existingJob = jobs.find((job) => job.offlineAttemptId === offlineAttemptId && job.status !== 'synced');

  if (existingJob) {
    return existingJob;
  }

  const job: SyncQueueJob = {
    id: uuidv4(),
    offlineAttemptId,
    type: 'SYNC_EXAM',
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await putRecord('syncQueue', job);
  return job;
}

export function getAllQueueJobs() {
  return getAllRecords('syncQueue') as Promise<SyncQueueJob[]>;
}

export function getPendingQueueJobs() {
  return getQueueJobsByStatus('pending');
}

export async function markQueueJobRunning(job: SyncQueueJob) {
  const next: SyncQueueJob = {
    ...job,
    status: 'running',
    attempts: job.attempts + 1,
    updatedAt: new Date().toISOString(),
  };

  await putRecord('syncQueue', next);
  return next;
}

export async function markQueueJobFailed(job: SyncQueueJob, error: string) {
  const next: SyncQueueJob = {
    ...job,
    status: 'failed',
    lastError: error,
    updatedAt: new Date().toISOString(),
  };

  await putRecord('syncQueue', next);
  return next;
}

export async function markQueueJobSynced(job: SyncQueueJob) {
  await deleteRecord('syncQueue', job.id);
}
