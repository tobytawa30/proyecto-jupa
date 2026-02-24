import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, schools, questions, questionOptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const activeExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        grade: exams.grade,
        storyTitle: exams.storyTitle,
        isActive: exams.isActive,
        totalPoints: exams.totalPoints,
      })
      .from(exams)
      .where(eq(exams.isActive, true))
      .orderBy(exams.grade);

    return NextResponse.json(activeExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Error al obtener exámenes' }, { status: 500 });
  }
}
