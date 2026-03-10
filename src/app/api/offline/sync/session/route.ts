import { NextResponse } from 'next/server';
import { getOrCreateOfflineSession } from '@/lib/exams/session-sync';
import type { OfflineSyncSessionPayload } from '@/lib/offline/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OfflineSyncSessionPayload>;

    if (!body.offlineAttemptId || !body.studentName || !body.schoolId || !body.examId || !body.grade) {
      return NextResponse.json({ error: 'Datos insuficientes para sincronizar la sesion' }, { status: 400 });
    }

    const { session, created } = await getOrCreateOfflineSession({
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

    return NextResponse.json({
      success: true,
      created,
      sessionId: session.id,
      completedAt: session.completedAt,
      syncedAt: session.syncedAt,
    });
  } catch (error) {
    console.error('Error syncing offline session:', error);
    return NextResponse.json({ error: 'Error al sincronizar la sesion offline' }, { status: 500 });
  }
}
