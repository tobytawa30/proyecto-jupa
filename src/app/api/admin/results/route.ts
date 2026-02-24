import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions, schools, exams } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade');
  const school = searchParams.get('school');

  const filters: any[] = [];
  if (grade) {
    filters.push(eq(studentSessions.grade, parseInt(grade)));
  }
  if (school) {
    filters.push(eq(studentSessions.schoolId, school));
  }
  filters.push(eq(studentSessions.completedAt, sql`NOT NULL`));

  try {
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
      .where(and(...filters))
      .orderBy(desc(studentSessions.completedAt))
      .limit(100);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
  }
}
