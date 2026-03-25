import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { offlineExamConflicts, studentSessions } from '@/lib/db/schema';
import type { OfflineSyncExamPayload, OfflineExamEvidenceSummary } from '@/lib/offline/types';

interface SnapshotOption {
  id: string;
  optionText: string;
  optionLabel: string;
  isCorrect?: boolean;
}

interface SnapshotQuestion {
  id: string;
  questionText: string;
  points: string | number;
  options: SnapshotOption[];
}

interface SnapshotExam {
  id: string;
  title?: string;
  totalPoints?: string | number;
  questions: SnapshotQuestion[];
}

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

export function getOfflineConflictTitle(reason: string) {
  switch (reason) {
    case 'EXAM_VERSION_MISMATCH':
      return 'El examen fue actualizado';
    case 'MISSING_QUESTION_REFERENCE':
      return 'Faltan preguntas de la version original';
    case 'MISSING_OPTION_REFERENCE':
      return 'Faltan opciones de respuesta';
    default:
      return 'Revision pendiente';
  }
}

export function getOfflineConflictDescription(reason: string) {
  switch (reason) {
    case 'EXAM_VERSION_MISMATCH':
      return 'Este examen se respondio con una version anterior y necesita revision antes de consolidarlo como resultado final.';
    case 'MISSING_QUESTION_REFERENCE':
      return 'Algunas preguntas ya no existen en la version actual del examen, por eso el resultado no pudo cerrarse automaticamente.';
    case 'MISSING_OPTION_REFERENCE':
      return 'Algunas opciones respondidas ya no existen en la version actual del examen, por eso el resultado requiere revision.';
    default:
      return 'Este intento requiere revision manual antes de considerarse final.';
  }
}

function toSnapshotExam(payload: unknown): SnapshotExam | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const snapshot = payload as Partial<SnapshotExam>;
  if (!Array.isArray(snapshot.questions)) {
    return null;
  }

  return snapshot as SnapshotExam;
}

function evidenceSummaryToSnapshot(payload: OfflineExamEvidenceSummary): SnapshotExam {
  return {
    id: payload.examId,
    title: payload.examTitle,
    questions: payload.questions.map((question) => ({
      id: question.questionId,
      questionText: question.questionText,
      points: question.points,
      options: question.options.map((option) => ({
        id: option.id,
        optionLabel: option.optionLabel,
        optionText: option.optionText,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}

function toRecoverableSnapshot(payload: Partial<OfflineSyncExamPayload> | unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalizedPayload = payload as Partial<OfflineSyncExamPayload>;
  const snapshot = toSnapshotExam(normalizedPayload.examSnapshotPayload);
  if (snapshot) {
    return snapshot;
  }

  if (normalizedPayload.examEvidenceSummary && Array.isArray(normalizedPayload.examEvidenceSummary.questions)) {
    return evidenceSummaryToSnapshot(normalizedPayload.examEvidenceSummary);
  }

  return null;
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function computePerformanceLevel(totalScore: number, totalPoints: number) {
  const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

  if (percentage >= 80) {
    return 'ALTO' as const;
  }

  if (percentage >= 50) {
    return 'MEDIO' as const;
  }

  return 'BAJO' as const;
}

export function scoreOfflineConflictAttempt(conflict: {
  examSnapshotPayload: unknown;
  syncPayload?: unknown;
  answersPayload: unknown;
}) {
  const snapshot = toSnapshotExam(conflict.examSnapshotPayload)
    || toRecoverableSnapshot(conflict.syncPayload || {});
  const answers = Array.isArray(conflict.answersPayload)
    ? (conflict.answersPayload as Array<{ questionId: string; selectedOptionId?: string }>)
    : [];

  if (!snapshot || snapshot.questions.length === 0) {
    throw new Error('El conflicto no tiene un snapshot de examen utilizable para resolverlo.');
  }

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOptionId]));
  let totalScore = 0;

  for (const question of snapshot.questions) {
    const selectedValue = answerMap.get(question.id);
    if (!selectedValue) {
      continue;
    }

    const selectedOption = question.options.find((option) => {
      if (option.id === selectedValue) {
        return true;
      }

      return normalizeValue(option.optionText) === normalizeValue(selectedValue);
    });

    if (selectedOption?.isCorrect) {
      totalScore += Number(question.points || 0);
    }
  }

  const totalPoints = Number(
    snapshot.totalPoints || snapshot.questions.reduce((sum, question) => sum + Number(question.points || 0), 0)
  );

  return {
    totalScore,
    totalPoints,
    performanceLevel: computePerformanceLevel(totalScore, totalPoints),
  };
}

export function canResolveOfflineConflictAutomatically(conflict: {
  examSnapshotPayload: unknown;
  syncPayload?: unknown;
}) {
  const snapshot = toSnapshotExam(conflict.examSnapshotPayload)
    || toRecoverableSnapshot(conflict.syncPayload || {});
  return Boolean(snapshot && snapshot.questions.length > 0);
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
    examSnapshotPayload: toRecoverableSnapshot(payload) ?? null,
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

export async function resolveOfflineExamConflict(conflictId: string) {
  const [conflict] = await db
    .select()
    .from(offlineExamConflicts)
    .where(eq(offlineExamConflicts.id, conflictId))
    .limit(1);

  if (!conflict) {
    throw new Error('Conflicto no encontrado.');
  }

  const resolution = scoreOfflineConflictAttempt(conflict);
  const now = new Date();
  const completedAt = conflict.createdAt || now;

  await db
    .update(studentSessions)
    .set({
      completedAt,
      totalScore: resolution.totalScore.toFixed(2),
      performanceLevel: resolution.performanceLevel,
      syncedAt: conflict.updatedAt || now,
    })
    .where(eq(studentSessions.id, conflict.sessionId));

  await db
    .update(offlineExamConflicts)
    .set({
      status: 'resolved',
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(offlineExamConflicts.id, conflict.id));

  return {
    sessionId: conflict.sessionId,
    totalScore: resolution.totalScore,
    performanceLevel: resolution.performanceLevel,
  };
}

export async function resolveOfflineExamConflictManually(conflictId: string) {
  const [conflict] = await db
    .select()
    .from(offlineExamConflicts)
    .where(eq(offlineExamConflicts.id, conflictId))
    .limit(1);

  if (!conflict) {
    throw new Error('Conflicto no encontrado.');
  }

  const now = new Date();
  const completedAt = conflict.createdAt || now;

  await db
    .update(studentSessions)
    .set({
      completedAt,
      totalScore: null,
      performanceLevel: null,
      syncedAt: conflict.updatedAt || now,
    })
    .where(eq(studentSessions.id, conflict.sessionId));

  await db
    .update(offlineExamConflicts)
    .set({
      status: 'resolved_manual',
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(offlineExamConflicts.id, conflict.id));

  return {
    sessionId: conflict.sessionId,
    totalScore: null,
    performanceLevel: null,
    status: 'resolved_manual',
  };
}

export async function resolveAllAutomaticallyResolvableConflicts(filters?: { grade?: number }) {
  const allConflicts = await db.select().from(offlineExamConflicts);

  const pendingConflicts = allConflicts.filter((conflict) => {
    if (conflict.status !== 'pending_review') {
      return false;
    }

    if (typeof filters?.grade === 'number' && conflict.grade !== filters.grade) {
      return false;
    }

    return canResolveOfflineConflictAutomatically(conflict);
  });

  const results = [] as Array<{ conflictId: string; sessionId: string; totalScore: number; performanceLevel: string }>;

  for (const conflict of pendingConflicts) {
    const result = await resolveOfflineExamConflict(conflict.id);
    results.push({
      conflictId: conflict.id,
      sessionId: result.sessionId,
      totalScore: result.totalScore,
      performanceLevel: result.performanceLevel,
    });
  }

  return {
    processed: pendingConflicts.length,
    results,
  };
}
