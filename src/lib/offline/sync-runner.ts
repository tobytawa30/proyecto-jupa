import { listOfflineAnswers, getOfflineAttempt, updateOfflineAttempt } from '@/lib/offline/attempt-repository';
import { getCachedExam } from '@/lib/offline/cache-repository';
import { hasEvidenceReadyExam } from '@/lib/offline/exam-evidence';
import { getAllQueueJobs, markQueueJobFailed, markQueueJobRunning, markQueueJobSynced } from '@/lib/offline/sync-queue';
import type { SyncQueueJob } from '@/lib/offline/types';

export interface SyncJobResult {
  jobId: string;
  offlineAttemptId: string;
  success: boolean;
  payload?: unknown;
  error?: string;
}

interface ExamSyncResponse {
  success: boolean;
  sessionId?: string;
  requiresReview?: boolean;
  reviewReason?: string;
  code?: string;
  error?: string;
  details?: string;
}

export async function runExamSyncJob(job: SyncQueueJob) {
  const runningJob = await markQueueJobRunning(job);

  try {
    const attempt = await getOfflineAttempt(job.offlineAttemptId);
    if (!attempt) {
      throw new Error('Intento offline no encontrado');
    }

    const [answers, cachedExam] = await Promise.all([
      listOfflineAnswers(job.offlineAttemptId),
      getCachedExam(attempt.examId),
    ]);
    const examSnapshotPayload = hasEvidenceReadyExam(cachedExam?.payload) ? cachedExam.payload : undefined;

    if (!examSnapshotPayload && (!attempt.examEvidenceSummary || attempt.examEvidenceSummary.questions.length === 0)) {
      throw new Error('No se encontro una copia suficiente del examen en este dispositivo para sincronizar de forma segura.');
    }

    await updateOfflineAttempt(job.offlineAttemptId, {
      status: 'running',
      lastSyncAttemptAt: new Date().toISOString(),
    });

    const response = await fetch('/api/offline/sync/exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offlineAttemptId: attempt.offlineAttemptId,
        examId: attempt.examId,
        studentName: attempt.studentName,
        schoolId: attempt.schoolId,
        grade: attempt.grade,
        deviceId: attempt.deviceId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        examSnapshotVersion: attempt.examSnapshotVersion,
        examSnapshotPayload,
        examEvidenceSummary: attempt.examEvidenceSummary,
        answers: answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
        })),
      }),
    });

    const payload = await response.json() as ExamSyncResponse;
    if (!response.ok) {
      const message = [payload.error, payload.details].filter(Boolean).join(': ');
      throw new Error(message || 'No se pudo sincronizar el examen offline');
    }

    await updateOfflineAttempt(job.offlineAttemptId, {
      status: payload.requiresReview ? 'review' : 'synced',
      syncedSessionId: payload.sessionId,
      syncError: undefined,
      requiresReview: Boolean(payload.requiresReview),
      reviewReason: payload.requiresReview ? payload.reviewReason : undefined,
      syncedAt: new Date().toISOString(),
      lastSyncResult: 'success',
    });

    await markQueueJobSynced(runningJob);

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al sincronizar';
    await updateOfflineAttempt(job.offlineAttemptId, {
      status: 'failed',
      syncError: message,
      lastSyncResult: 'error',
    });
    await markQueueJobFailed(runningJob, message);
    throw error;
  }
}

export async function runAllPendingSyncJobs() {
  const jobs = await getAllQueueJobs();
  const runnableJobs = jobs
    .filter((job) => job.status === 'pending' || job.status === 'failed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const results: SyncJobResult[] = [];
  for (const job of runnableJobs) {
    try {
      const payload = await runExamSyncJob(job);
      results.push({
        jobId: job.id,
        offlineAttemptId: job.offlineAttemptId,
        success: true,
        payload,
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        offlineAttemptId: job.offlineAttemptId,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al sincronizar',
      });
    }
  }

  return results;
}
