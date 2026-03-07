import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exams, questions, questionOptions } from '@/lib/db/schema';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';

type ExamQuestionPayload = {
  section?: string;
  sectionTitle?: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING';
  points: number | string;
  helperText?: string;
  contextText?: string;
  options?: Array<{
    optionLabel?: string;
    optionText: string;
    isCorrect: boolean;
  }>;
};

function normalizeQuestionPayload(question: ExamQuestionPayload, index: number) {
  const normalizedOptions = (question.options || []).map((option, optionIndex) => ({
    optionLabel: String.fromCharCode(65 + optionIndex),
    optionText: option.optionText.trim(),
    isCorrect: Boolean(option.isCorrect),
    orderIndex: optionIndex,
  }));

  return {
    section: question.section?.trim() || null,
    sectionTitle: question.sectionTitle?.trim() || null,
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    orderIndex: index,
    points: Number(question.points).toString(),
    helperText: question.helperText?.trim() || null,
    contextText: question.contextText?.trim() || null,
    options: normalizedOptions,
  };
}

function validateQuestionPayload(question: ReturnType<typeof normalizeQuestionPayload>, index: number) {
  if (!question.questionText) {
    return `La pregunta ${index + 1} debe tener un enunciado`;
  }

  if (!Number.isFinite(Number(question.points)) || Number(question.points) < 0) {
    return `La pregunta ${index + 1} tiene un puntaje invalido`;
  }

  if (question.questionType === 'MATCHING' && !question.contextText) {
    return `La pregunta ${index + 1} debe incluir el texto de referencia`;
  }

  if (question.options.length < 2) {
    return `La pregunta ${index + 1} debe tener al menos dos opciones`;
  }

  if (question.options.some((option) => !option.optionText)) {
    return `Completa todas las opciones de la pregunta ${index + 1}`;
  }

  if (question.options.filter((option) => option.isCorrect).length !== 1) {
    return `La pregunta ${index + 1} debe tener una sola respuesta correcta`;
  }

  return null;
}

function validateExamPayload(payload: {
  title?: string;
  grade?: number;
  storyTitle?: string;
  storyContent?: string;
}) {
  const grade = payload.grade;

  if (!payload.title?.trim()) return 'El titulo del examen es requerido';
  if (!payload.storyTitle?.trim()) return 'El titulo del cuento es requerido';
  if (!payload.storyContent?.trim()) return 'El contenido del cuento es requerido';
  if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 1 || grade > 4) {
    return 'El grado es invalido';
  }

  return null;
}

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

    const [exam] = await db.select().from(exams).where(eq(exams.id, id)).limit(1);

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
    const examValidationError = validateExamPayload({ title, grade, storyTitle, storyContent });
    if (examValidationError) {
      return NextResponse.json({ error: examValidationError }, { status: 400 });
    }

    const normalizedQuestions = (examQuestions || []).map(normalizeQuestionPayload);

    for (const [index, question] of normalizedQuestions.entries()) {
      const validationError = validateQuestionPayload(question, index);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    await db
      .update(exams)
      .set({
        title: title.trim(),
        grade,
        storyTitle: storyTitle.trim(),
        storyContent: storyContent.trim(),
        isActive,
        totalPoints,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, id));

    await db.delete(questions).where(eq(questions.examId, id));

    for (const q of normalizedQuestions) {
      const [newQuestion] = await db
        .insert(questions)
        .values({
          examId: id,
          section: q.section,
          sectionTitle: q.sectionTitle,
          questionText: q.questionText,
          questionType: q.questionType,
          orderIndex: q.orderIndex,
          points: q.points,
          helperText: q.helperText,
          contextText: q.contextText,
        })
        .returning();

      if (q.options.length > 0) {
        await db.insert(questionOptions).values(
          q.options.map((opt: (typeof q.options)[number]) => ({
            questionId: newQuestion.id,
            optionLabel: opt.optionLabel,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex,
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
