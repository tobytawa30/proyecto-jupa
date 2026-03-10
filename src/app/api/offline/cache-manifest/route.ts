import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { schools } from '@/lib/db/schema';
import { getActiveExamManifestItems } from '@/lib/exams/public';

export async function GET() {
  try {
    const [allSchools, activeExams] = await Promise.all([
      db
        .select({
          id: schools.id,
          name: schools.name,
          code: schools.code,
        })
        .from(schools)
        .orderBy(schools.name),
      getActiveExamManifestItems(),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      schools: allSchools,
      exams: activeExams.map((exam) => ({
        ...exam,
        updatedAt: exam.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching offline cache manifest:', error);
    return NextResponse.json({ error: 'Error al obtener manifest offline' }, { status: 500 });
  }
}
