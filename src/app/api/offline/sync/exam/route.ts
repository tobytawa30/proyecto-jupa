import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, studentSessions } from '@/lib/db/schema';
import { persistOfflineExamConflict } from '@/lib/exams/offline-conflicts';
import { gradeAndStoreExamSubmission } from '@/lib/exams/grading';
import { getOrCreateOfflineSession } from '@/lib/exams/session-sync';
import type { OfflineSyncExamPayload } from '@/lib/offline/types';
import { eq } from 'drizzle-orm';
import { getErrorDebugMessage, getOfflineSchemaMismatchMessage, isOfflineSchemaMismatch } from '@/lib/db/error-utils';

function isOfflineReferenceConflict(error: unknown) {
  const maybeDbError = error as { code?: string; constraint?: string };

  if (maybeDbError.code !== '23503') {
    return false;
  }

  return (
    maybeDbError.constraint === 'exam_answers_question_id_questions_id_fk' ||
    maybeDbError.constraint === 'exam_answers_selected_option_id_question_options_id_fk'
  );
}

function getOfflineConflictReason(error: unknown) {
  const maybeDbError = error as { constraint?: string };

  if (maybeDbError.constraint === 'exam_answers_selected_option_id_question_options_id_fk') {
    return 'MISSING_OPTION_REFERENCE';
  }

  return 'MISSING_QUESTION_REFERENCE';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OfflineSyncExamPayload> & {
      studentName?: string;
      schoolId?: string;
      grade?: number;
      deviceId?: string;
      startedAt?: string;
    };

    if (!body.offlineAttemptId || !body.examId || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'Datos insuficientes para sincronizar el examen' }, { status: 400 });
    }

    let sessionId = body.sessionId;

    if (!sessionId) {
      if (!body.studentName || !body.schoolId || !body.grade) {
        return NextResponse.json({ error: 'Faltan datos para crear la sesion offline' }, { status: 400 });
      }

      const offlineSession = await getOrCreateOfflineSession({
        offlineAttemptId: body.offlineAttemptId,
        studentName: body.studentName,
        schoolId: body.schoolId,
        grade: body.grade,
        examId: body.examId,
        sessionType: 'EXAM',
        deviceId: body.deviceId,
        startedAt: body.startedAt,
        completedAt: body.completedAt,
        examSnapshotVersion: body.examSnapshotVersion,
      });

      sessionId = offlineSession.session.id;
    }

    const [session] = await db
      .select()
      .from(studentSessions)
      .where(eq(studentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 });
    }

    const [exam] = await db
      .select({
        id: exams.id,
        updatedAt: exams.updatedAt,
      })
      .from(exams)
      .where(eq(exams.id, body.examId))
      .limit(1);

    if (!exam) {
      return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
    }

    const currentVersion = exam.updatedAt.toISOString();

    if (session.completedAt) {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        totalScore: Number(session.totalScore || 0),
        performanceLevel: session.performanceLevel,
        alreadyCompleted: true,
      });
    }

    if (body.examSnapshotVersion) {
      const snapshotVersion = new Date(body.examSnapshotVersion).toISOString();

      if (snapshotVersion !== currentVersion) {
        const reviewState = await persistOfflineExamConflict({
          sessionId: session.id,
          currentVersion,
          reason: 'EXAM_VERSION_MISMATCH',
          payload: body,
        });

        return NextResponse.json(
          {
            success: true,
            sessionId: session.id,
            code: 'OFFLINE_REVIEW_REQUIRED',
            ...reviewState,
            currentVersion,
            snapshotVersion,
          },
          { status: 200 }
        );
      }
    }

    let result;

    try {
      result = await gradeAndStoreExamSubmission({
        sessionId,
        answers: body.answers,
        completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        markSyncedAt: new Date(),
      });
    } catch (error) {
      if (isOfflineReferenceConflict(error)) {
        const reviewState = await persistOfflineExamConflict({
          sessionId: session.id,
          currentVersion,
          reason: getOfflineConflictReason(error),
          payload: body,
        });

        return NextResponse.json({
          success: true,
          sessionId: session.id,
          code: 'OFFLINE_REVIEW_REQUIRED',
          ...reviewState,
          currentVersion,
        });
      }

      throw error;
    }

    return NextResponse.json({
      ...result,
      sessionId,
    });
  } catch (error) {
    console.error('Error syncing offline exam:', error);

    if (isOfflineSchemaMismatch(error)) {
      return NextResponse.json({ error: getOfflineSchemaMismatchMessage() }, { status: 503 });
    }

    return NextResponse.json({
      error: 'Error al sincronizar examen offline',
      details: getErrorDebugMessage(error),
    }, { status: 500 });
  }
}
