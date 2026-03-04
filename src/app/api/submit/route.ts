import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions, examAnswers, questions, questionOptions, exams } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

    const questionIds = answers.map((a: any) => a.questionId);
    const questionData = await db
      .select({
        id: questions.id,
        points: questions.points,
        questionType: questions.questionType,
      })
      .from(questions)
      .where(inArray(questions.id, questionIds));

    const questionMap = new Map(questionData.map((q) => [q.id, q]));

    const answeredOptions = answers.filter((a: any) => a.selectedOptionId);

    let selectedOptions: any[] = [];
    if (answeredOptions.length > 0) {
      const optionIds = answeredOptions.map((a: any) => a.selectedOptionId);
      selectedOptions = await db
        .select({
          id: questionOptions.id,
          isCorrect: questionOptions.isCorrect,
          questionId: questionOptions.questionId,
          optionText: questionOptions.optionText,
          optionLabel: questionOptions.optionLabel,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.id, optionIds));
    }

    const selectedOptionsMap = new Map(
      selectedOptions.map((o) => [o.id, {
        isCorrect: o.isCorrect,
        questionId: o.questionId,
        optionText: o.optionText,
        optionLabel: o.optionLabel,
      }])
    );

    let totalScore = 0;

    for (const answer of answeredOptions) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      
      const selectedOption = selectedOptionsMap.get(answer.selectedOptionId);
      const isCorrect = selectedOption?.isCorrect ?? false;

      if (isCorrect) {
        totalScore += parseFloat(question.points.toString());
      }
    }

    // Build answer records
    const answerRecords = answers.map((answer: any) => {
      const question = questionMap.get(answer.questionId);

      const selectedOption = selectedOptionsMap.get(answer.selectedOptionId);
      const isCorrect = selectedOption?.isCorrect ?? false;
      const pointsEarned = isCorrect ? parseFloat(question?.points?.toString() || '0') : 0;

      return {
        sessionId,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId || undefined,
        isCorrect,
        pointsEarned: pointsEarned.toString(),
      };
    });

    const recordsToInsert = answerRecords.filter((r: { selectedOptionId?: string }) => Boolean(r.selectedOptionId));

    if (recordsToInsert.length > 0) {
      await db.insert(examAnswers).values(recordsToInsert);
    }

    const [examData] = await db.select().from(exams).where(eq(exams.id, session.examId!)).limit(1);

    let performanceLevel: string | null = null;
    if (examData && examData.totalPoints) {
      const totalPoints = parseFloat(examData.totalPoints.toString());
      const percentage = (totalScore / totalPoints) * 100;

      if (percentage >= 80) {
        performanceLevel = 'ALTO';
      } else if (percentage >= 50) {
        performanceLevel = 'MEDIO';
      } else {
        performanceLevel = 'BAJO';
      }
    }

    await db
      .update(studentSessions)
      .set({
        completedAt: new Date(),
        totalScore: totalScore.toString(),
        performanceLevel: performanceLevel as any,
      })
      .where(eq(studentSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      totalScore,
      performanceLevel,
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error al enviar examen' }, { status: 500 });
  }
}
