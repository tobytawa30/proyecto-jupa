import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions, schools, exams, offlineExamConflicts } from '@/lib/db/schema';
import { eq, sql, desc, and, ilike, or } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');
  const school = searchParams.get('school');
  const exam = searchParams.get('exam');
  const level = searchParams.get('level');
  const name = searchParams.get('name');
  const date = searchParams.get('date');

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('pageSize') || '10', 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(pageSizeParam, 100)
    : 10;
  const offset = (page - 1) * pageSize;
  const visibleAt = sql`COALESCE(${studentSessions.completedAt}, ${studentSessions.syncedAt})`;
  const visibilityFilter = or(
    sql`${studentSessions.completedAt} IS NOT NULL`,
    eq(offlineExamConflicts.status, 'pending_review'),
  );

  const filters: any[] = [];
  if (grade) {
    const parsedGrade = parseInt(grade, 10);
    if (!Number.isNaN(parsedGrade)) {
      filters.push(eq(studentSessions.grade, parsedGrade));
    }
  }
  if (school) {
    filters.push(eq(studentSessions.schoolId, school));
  }
  if (exam) {
    filters.push(eq(studentSessions.examId, exam));
  }
  if (level) {
    filters.push(eq(studentSessions.performanceLevel, level as any));
  }
  if (name) {
    filters.push(ilike(studentSessions.name, `%${name}%`));
  }
  if (date) {
    filters.push(sql`DATE(${visibleAt}) = ${date}`);
  }
  filters.push(visibilityFilter);

  const whereClause = and(...filters);

  try {
    const [totalResult] = await db
      .select({ count: sql<number>`count(distinct ${studentSessions.id})` })
      .from(studentSessions)
      .leftJoin(offlineExamConflicts, eq(studentSessions.id, offlineExamConflicts.sessionId))
      .where(whereClause);

    const total = Number(totalResult?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const results = await db
      .select({
        id: studentSessions.id,
        name: studentSessions.name,
        grade: studentSessions.grade,
        totalScore: studentSessions.totalScore,
        performanceLevel: studentSessions.performanceLevel,
        completedAt: studentSessions.completedAt,
        syncedAt: studentSessions.syncedAt,
        displayDate: visibleAt,
        reviewStatus: offlineExamConflicts.status,
        reviewReason: offlineExamConflicts.reason,
        schoolName: schools.name,
        examTitle: exams.title,
      })
      .from(studentSessions)
      .leftJoin(schools, eq(studentSessions.schoolId, schools.id))
      .leftJoin(exams, eq(studentSessions.examId, exams.id))
      .leftJoin(offlineExamConflicts, eq(studentSessions.id, offlineExamConflicts.sessionId))
      .where(whereClause)
      .orderBy(desc(visibleAt))
      .limit(pageSize)
      .offset(offset);

    const examsList = await db
      .select({
        id: exams.id,
        title: exams.title,
        grade: exams.grade,
      })
      .from(exams)
      .orderBy(exams.grade, exams.title);

    return NextResponse.json({
      results,
      exams: examsList,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
  }
}
