import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { gradeAndStoreExamSubmission } from '@/lib/exams/grading';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, answers } = body;

    const [session] = await db.select().from(studentSessions).where(eq(studentSessions.id, sessionId)).limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (session.completedAt) {
      return NextResponse.json({ error: 'Examen ya completado' }, { status: 400 });
    }

    const result = await gradeAndStoreExamSubmission({
      sessionId,
      answers,
      completedAt: new Date(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting exam:', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error al enviar examen' }, { status: 500 });
  }
}
