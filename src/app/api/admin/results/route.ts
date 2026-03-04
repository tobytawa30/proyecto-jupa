import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions, schools, exams } from '@/lib/db/schema';
import { eq, sql, desc, and, ilike, count } from 'drizzle-orm';

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
    filters.push(sql`DATE(${studentSessions.completedAt}) = ${date}`);
  }
  filters.push(sql`${studentSessions.completedAt} IS NOT NULL`);

  const whereClause = and(...filters);

  try {
    const [totalResult] = await db
      .select({ count: count() })
      .from(studentSessions)
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
        schoolName: schools.name,
        examTitle: exams.title,
      })
      .from(studentSessions)
      .leftJoin(schools, eq(studentSessions.schoolId, schools.id))
      .leftJoin(exams, eq(studentSessions.examId, exams.id))
      .where(whereClause)
      .orderBy(desc(studentSessions.completedAt))
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
