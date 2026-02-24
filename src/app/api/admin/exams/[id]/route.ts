import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, questions, questionOptions } from '@/lib/db/schema';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const { id } = await params;

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, id),
    });

    if (!exam) {
      return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
    }

    const examQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, id))
      .orderBy(asc(questions.orderIndex));

    const questionsWithOptions = await Promise.all(
      examQuestions.map(async (q) => {
        const options = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(asc(questionOptions.orderIndex));

        return {
          ...q,
          options,
        };
      })
    );

    return NextResponse.json({
      ...exam,
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: 'Error al obtener examen' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, grade, storyTitle, storyContent, isActive, totalPoints, questions: examQuestions } = body;

    await db
      .update(exams)
      .set({
        title,
        grade,
        storyTitle,
        storyContent,
        isActive,
        totalPoints,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, id));

    await db.delete(questions).where(eq(questions.examId, id));

    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i];
      const [newQuestion] = await db
        .insert(questions)
        .values({
          examId: id,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json({ error: 'Error al actualizar examen' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const { id } = await params;
    await db.delete(exams).where(eq(exams.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: 'Error al eliminar examen' }, { status: 500 });
  }
}
