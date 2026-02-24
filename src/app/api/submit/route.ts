import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentSessions, examAnswers, questions, questionOptions, exams } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, answers } = body;

    const session = await db.query.studentSessions.findFirst({
      where: eq(studentSessions.id, sessionId),
    });

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

    const optionIds = answers
      .filter((a: any) => a.selectedOptionId)
      .map((a: any) => a.selectedOptionId);

    let correctOptions: any[] = [];
    if (optionIds.length > 0) {
      correctOptions = await db
        .select({
          id: questionOptions.id,
          isCorrect: questionOptions.isCorrect,
          questionId: questionOptions.questionId,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.id, optionIds));
    }

    const correctOptionsMap = new Map(
      correctOptions.map((o) => [o.id, { isCorrect: o.isCorrect, questionId: o.questionId }])
    );

    let totalScore = 0;

    const answerRecords = answers.map((answer: any) => {
      const question = questionMap.get(answer.questionId);
      const selectedOption = answer.selectedOptionId
        ? correctOptionsMap.get(answer.selectedOptionId)
        : null;

      const isCorrect = selectedOption?.isCorrect ?? false;
      const pointsEarned = isCorrect && question ? parseFloat(question.points.toString()) : 0;

      if (isCorrect && question) {
        totalScore += parseFloat(question.points.toString());
      }

      return {
        sessionId,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId || null,
        isCorrect,
        pointsEarned: pointsEarned.toString(),
      };
    });

    await db.insert(examAnswers).values(answerRecords);

    const examData = await db.query.exams.findFirst({
      where: eq(exams.id, session.examId!),
    });

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
    return NextResponse.json({ error: 'Error al enviar examen' }, { status: 500 });
  }
}
