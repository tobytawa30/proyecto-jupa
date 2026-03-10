import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { studentSessions } from '@/lib/db/schema';
import type { OfflineSyncSessionPayload } from '@/lib/offline/types';

export async function getOrCreateOfflineSession(payload: OfflineSyncSessionPayload) {
  const [existingSession] = await db
    .select()
    .from(studentSessions)
    .where(eq(studentSessions.offlineAttemptId, payload.offlineAttemptId))
    .limit(1);

  if (existingSession) {
    return {
      session: existingSession,
      created: false,
    };
  }

  try {
    const sessionId = uuidv4();
    const [newSession] = await db
      .insert(studentSessions)
      .values({
        id: sessionId,
        name: payload.studentName,
        schoolId: payload.schoolId,
        grade: payload.grade,
        examId: payload.examId,
        sessionType: payload.sessionType,
        startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
        offlineAttemptId: payload.offlineAttemptId,
        source: 'OFFLINE',
        deviceId: payload.deviceId || null,
        examSnapshotVersion: payload.examSnapshotVersion ? new Date(payload.examSnapshotVersion) : null,
      })
      .returning();

    return {
      session: newSession,
      created: true,
    };
  } catch (error) {
    const maybeDbError = error as { code?: string };

    if (maybeDbError.code === '23505') {
      const [conflictedSession] = await db
        .select()
        .from(studentSessions)
        .where(eq(studentSessions.offlineAttemptId, payload.offlineAttemptId))
        .limit(1);

      if (conflictedSession) {
        return {
          session: conflictedSession,
          created: false,
        };
      }
    }

    throw error;
  }
}
