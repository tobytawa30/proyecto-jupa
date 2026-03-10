import {
  deleteRecord,
  getAllRecords,
  getAnswersForAttempt,
  getRecord,
  putRecord,
} from '@/lib/offline/indexed-db';
import type {
  OfflineAnswerRecord,
  OfflineAttemptPayload,
  OfflineAttemptRecord,
  OfflineExamAnswerPayload,
  OfflineSyncStatus,
} from '@/lib/offline/types';

export async function createOfflineAttempt(payload: OfflineAttemptPayload) {
  const now = new Date().toISOString();
  const record: OfflineAttemptRecord = {
    ...payload,
    currentQuestionIndex: 0,
    showStory: true,
    status: 'draft',
    lastSavedAt: now,
  };

  await putRecord('offlineAttempts', record);
  return record;
}

export function getOfflineAttempt(offlineAttemptId: string) {
  return getRecord('offlineAttempts', offlineAttemptId) as Promise<OfflineAttemptRecord | undefined>;
}

export function listOfflineAttempts() {
  return getAllRecords('offlineAttempts') as Promise<OfflineAttemptRecord[]>;
}

export async function saveOfflineAnswer(offlineAttemptId: string, answer: OfflineExamAnswerPayload) {
  const record: OfflineAnswerRecord = {
    offlineAttemptId,
    questionId: answer.questionId,
    selectedOptionId: answer.selectedOptionId,
    savedAt: new Date().toISOString(),
  };

  await putRecord('offlineAnswers', record);
  await touchOfflineAttempt(offlineAttemptId);
}

export function listOfflineAnswers(offlineAttemptId: string) {
  return getAnswersForAttempt(offlineAttemptId);
}

export async function updateOfflineAttempt(
  offlineAttemptId: string,
  updates: Partial<OfflineAttemptRecord>,
) {
  const current = await getOfflineAttempt(offlineAttemptId);
  if (!current) {
    throw new Error('Intento offline no encontrado');
  }

  const next: OfflineAttemptRecord = {
    ...current,
    ...updates,
    lastSavedAt: new Date().toISOString(),
  };

  await putRecord('offlineAttempts', next);
  return next;
}

export function updateOfflineAttemptStatus(offlineAttemptId: string, status: OfflineSyncStatus, syncError?: string) {
  return updateOfflineAttempt(offlineAttemptId, {
    status,
    syncError,
    lastSyncResult: status === 'synced' ? 'success' : status === 'failed' ? 'error' : undefined,
  });
}

export async function completeOfflineAttempt(offlineAttemptId: string) {
  return updateOfflineAttempt(offlineAttemptId, {
    status: 'completed_local',
    completedAt: new Date().toISOString(),
  });
}

export async function removeOfflineAttempt(offlineAttemptId: string) {
  const answers = await listOfflineAnswers(offlineAttemptId);
  await Promise.all(answers.map((answer) => deleteRecord('offlineAnswers', [answer.offlineAttemptId, answer.questionId])));
  await deleteRecord('offlineAttempts', offlineAttemptId);
}

async function touchOfflineAttempt(offlineAttemptId: string) {
  const current = await getOfflineAttempt(offlineAttemptId);
  if (!current) {
    return;
  }

  await putRecord('offlineAttempts', {
    ...current,
    lastSavedAt: new Date().toISOString(),
  });
}
