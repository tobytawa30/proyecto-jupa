import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentName, schoolId, grade, examId, sessionType } = body;

    const sessionId = uuidv4();

    const newSession = await db.insert(studentSessions).values({
      id: sessionId,
      name: studentName,
      schoolId,
      grade,
      examId,
      sessionType,
      startedAt: new Date(),
    }).returning();

    return NextResponse.json({ sessionId: newSession[0].id });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Error al crear sesión' }, { status: 500 });
  }
}
