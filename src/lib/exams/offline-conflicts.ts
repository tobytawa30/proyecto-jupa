import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { offlineExamConflicts, studentSessions } from '@/lib/db/schema';
import type { OfflineSyncExamPayload } from '@/lib/offline/types';

interface PersistOfflineExamConflictInput {
  sessionId: string;
  currentVersion?: string;
  reason: string;
  payload: Partial<OfflineSyncExamPayload> & {
    studentName?: string;
    schoolId?: string;
    grade?: number;
    deviceId?: string;
  };
}

export function getOfflineReviewMessage(reason: string) {
  switch (reason) {
    case 'EXAM_VERSION_MISMATCH':
      return 'Sincronizado con revision pendiente: el examen cambio despues de descargarse en el dispositivo.';
    case 'MISSING_QUESTION_REFERENCE':
      return 'Sincronizado con revision pendiente: el examen cambio y algunas preguntas ya no existen en la version actual.';
    case 'MISSING_OPTION_REFERENCE':
      return 'Sincronizado con revision pendiente: algunas opciones del examen ya no existen en la version actual.';
    default:
      return 'Sincronizado con revision pendiente.';
  }
}

export async function persistOfflineExamConflict({
  sessionId,
  currentVersion,
  reason,
  payload,
}: PersistOfflineExamConflictInput) {
  if (!payload.offlineAttemptId || !payload.examId || !payload.studentName || !payload.schoolId || !payload.grade) {
    throw new Error('Faltan datos para guardar el conflicto offline');
  }

  const now = new Date();
  const conflictValues = {
    offlineAttemptId: payload.offlineAttemptId,
    sessionId,
    examId: payload.examId,
    studentName: payload.studentName,
    schoolId: payload.schoolId,
    grade: payload.grade,
    deviceId: payload.deviceId || null,
    reason,
    status: 'pending_review',
    snapshotVersion: payload.examSnapshotVersion ? new Date(payload.examSnapshotVersion) : null,
    currentVersion: currentVersion ? new Date(currentVersion) : null,
    answersPayload: payload.answers || [],
    examSnapshotPayload: payload.examSnapshotPayload ?? null,
    syncPayload: payload,
    updatedAt: now,
  } as const;

  const [existingConflict] = await db
    .select()
    .from(offlineExamConflicts)
    .where(eq(offlineExamConflicts.offlineAttemptId, payload.offlineAttemptId))
    .limit(1);

  if (existingConflict) {
    await db
      .update(offlineExamConflicts)
      .set(conflictValues)
      .where(eq(offlineExamConflicts.id, existingConflict.id));
  } else {
    await db.insert(offlineExamConflicts).values({
      ...conflictValues,
      createdAt: now,
    });
  }

  await db
    .update(studentSessions)
    .set({
      syncedAt: now,
      localStorageBackup: payload,
    })
    .where(eq(studentSessions.id, sessionId));

  return {
    requiresReview: true,
    reviewReason: getOfflineReviewMessage(reason),
  };
}
