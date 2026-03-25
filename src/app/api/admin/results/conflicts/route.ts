import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exams, offlineExamConflicts, schools, studentSessions } from '@/lib/db/schema';
import { canResolveOfflineConflictAutomatically } from '@/lib/exams/offline-conflicts';

export async function GET() {
  try {
    const conflicts = await db
      .select({
        id: offlineExamConflicts.id,
        status: offlineExamConflicts.status,
        reason: offlineExamConflicts.reason,
        createdAt: offlineExamConflicts.createdAt,
        updatedAt: offlineExamConflicts.updatedAt,
        resolvedAt: offlineExamConflicts.resolvedAt,
        examSnapshotPayload: offlineExamConflicts.examSnapshotPayload,
        studentName: studentSessions.name,
        grade: offlineExamConflicts.grade,
        schoolName: schools.name,
        examTitle: exams.title,
        sessionId: offlineExamConflicts.sessionId,
      })
      .from(offlineExamConflicts)
      .leftJoin(studentSessions, eq(offlineExamConflicts.sessionId, studentSessions.id))
      .leftJoin(schools, eq(offlineExamConflicts.schoolId, schools.id))
      .leftJoin(exams, eq(offlineExamConflicts.examId, exams.id))
      .orderBy(desc(offlineExamConflicts.updatedAt));

    const normalizedConflicts = conflicts.map((conflict) => ({
      ...conflict,
      canResolveAutomatically: canResolveOfflineConflictAutomatically(conflict),
      examSnapshotPayload: undefined,
    }));

    return NextResponse.json({ conflicts: normalizedConflicts });
  } catch (error) {
    console.error('Error fetching result conflicts:', error);
    return NextResponse.json({ error: 'Error al obtener conflictos de resultados' }, { status: 500 });
  }
}
