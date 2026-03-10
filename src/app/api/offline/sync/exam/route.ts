import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, studentSessions } from '@/lib/db/schema';
import { gradeAndStoreExamSubmission } from '@/lib/exams/grading';
import { getOrCreateOfflineSession } from '@/lib/exams/session-sync';
import type { OfflineSyncExamPayload } from '@/lib/offline/types';
import { eq } from 'drizzle-orm';

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

    if (body.examSnapshotVersion) {
      const snapshotVersion = new Date(body.examSnapshotVersion).toISOString();
      const currentVersion = exam.updatedAt.toISOString();

      if (snapshotVersion !== currentVersion) {
        return NextResponse.json(
          {
            error: 'El examen fue modificado despues de descargarse en este dispositivo. Requiere revision antes de sincronizar.',
            code: 'EXAM_VERSION_MISMATCH',
            currentVersion,
            snapshotVersion,
          },
          { status: 409 }
        );
      }
    }

    if (session.completedAt) {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        totalScore: Number(session.totalScore || 0),
        performanceLevel: session.performanceLevel,
        alreadyCompleted: true,
      });
    }

    const result = await gradeAndStoreExamSubmission({
      sessionId,
      answers: body.answers,
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
      markSyncedAt: new Date(),
    });

    return NextResponse.json({
      ...result,
      sessionId,
    });
  } catch (error) {
    console.error('Error syncing offline exam:', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error al sincronizar examen offline' }, { status: 500 });
  }
}
