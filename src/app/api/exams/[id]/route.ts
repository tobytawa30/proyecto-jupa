import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, questions, questionOptions, schools } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, id),
    });

    if (!exam) {
      return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
    }

    const examQuestions = await db
      .select({
        id: questions.id,
        section: questions.section,
        sectionTitle: questions.sectionTitle,
        questionText: questions.questionText,
        questionType: questions.questionType,
        orderIndex: questions.orderIndex,
        points: questions.points,
        helperText: questions.helperText,
        contextText: questions.contextText,
      })
      .from(questions)
      .where(eq(questions.examId, id))
      .orderBy(asc(questions.orderIndex));

    const questionsWithOptions = await Promise.all(
      examQuestions.map(async (q) => {
        const options = await db
          .select({
            id: questionOptions.id,
            optionLabel: questionOptions.optionLabel,
            optionText: questionOptions.optionText,
          })
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
