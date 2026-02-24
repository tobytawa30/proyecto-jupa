import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, questions, questionOptions } from '@/lib/db/schema';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const body = await request.json();
    const { title, grade, storyTitle, storyContent, isActive, totalPoints, questions: examQuestions } = body;

    const [newExam] = await db
      .insert(exams)
      .values({
        title,
        grade,
        storyTitle,
        storyContent,
        isActive,
        totalPoints,
      })
      .returning();

    if (examQuestions && examQuestions.length > 0) {
      for (let i = 0; i < examQuestions.length; i++) {
        const q = examQuestions[i];
        const [newQuestion] = await db
          .insert(questions)
          .values({
            examId: newExam.id,
            section: q.section,
            sectionTitle: q.sectionTitle,
            questionText: q.questionText,
            questionType: q.questionType,
            orderIndex: i,
            points: q.points.toString(),
            helperText: q.helperText,
            contextText: q.contextText,
          })
          .returning();

        if (q.options && q.options.length > 0) {
          await db.insert(questionOptions).values(
            q.options.map((opt: any, oi: number) => ({
              questionId: newQuestion.id,
              optionLabel: opt.optionLabel,
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: oi,
            }))
          );
        }
      }
    }

    return NextResponse.json({ id: newExam.id, success: true });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Error al crear examen' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
}
