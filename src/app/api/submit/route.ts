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

    // Separate TRUE_FALSE answers from others
    const trueFalseAnswers = answers.filter((a: any) => {
      const q = questionMap.get(a.questionId);
      return q?.questionType === 'TRUE_FALSE' && a.selectedOptionId;
    });
    
    const normalAnswers = answers.filter((a: any) => {
      const q = questionMap.get(a.questionId);
      return q?.questionType !== 'TRUE_FALSE' && a.selectedOptionId;
    });

    let correctOptions: any[] = [];
    if (normalAnswers.length > 0) {
      const optionIds = normalAnswers.map((a: any) => a.selectedOptionId);
      correctOptions = await db
        .select({
          id: questionOptions.id,
          isCorrect: questionOptions.isCorrect,
          questionId: questionOptions.questionId,
          optionText: questionOptions.optionText,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.id, optionIds));
    }

    const correctOptionsMap = new Map(
      correctOptions.map((o) => [o.id, { isCorrect: o.isCorrect, questionId: o.questionId, optionText: o.optionText }])
    );

    let totalScore = 0;

    // Process TRUE_FALSE questions first
    for (const answer of trueFalseAnswers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      
      const tfOptions = await db
        .select({
          id: questionOptions.id,
          optionText: questionOptions.optionText,
          isCorrect: questionOptions.isCorrect,
        })
        .from(questionOptions)
        .where(eq(questionOptions.questionId, answer.questionId));
      
      const correctOption = tfOptions.find(o => o.isCorrect);
      const isCorrect = correctOption ? answer.selectedOptionId === correctOption.optionText : false;
      const pointsEarned = isCorrect ? parseFloat(question.points.toString()) : 0;
      
      if (isCorrect) {
        totalScore += parseFloat(question.points.toString());
      }
    }

    // Process normal questions
    for (const answer of normalAnswers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      
      const selectedOption = correctOptionsMap.get(answer.selectedOptionId);
      const isCorrect = selectedOption?.isCorrect ?? false;
      const pointsEarned = isCorrect ? parseFloat(question.points.toString()) : 0;

      if (isCorrect) {
        totalScore += parseFloat(question.points.toString());
      }
    }

    // Build answer records
    const answerRecords = answers.map((answer: any) => {
      const question = questionMap.get(answer.questionId);
      
      if (question?.questionType === 'TRUE_FALSE') {
        // Will be calculated below
        return {
          sessionId,
          questionId: answer.questionId,
          selectedOptionId: undefined, // Don't store for TRUE_FALSE
          isCorrect: false,
          pointsEarned: '0',
        };
      }
      
      const selectedOption = correctOptionsMap.get(answer.selectedOptionId);
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

    // Calculate TRUE_FALSE scores for storage
    for (let i = 0; i < answerRecords.length; i++) {
      const answer = answers[i];
      const question = questionMap.get(answer.questionId);
      if (question?.questionType === 'TRUE_FALSE') {
        const tfOptions = await db
          .select({
            optionText: questionOptions.optionText,
            isCorrect: questionOptions.isCorrect,
          })
          .from(questionOptions)
          .where(eq(questionOptions.questionId, answer.questionId));
        
        const correctOption = tfOptions.find(o => o.isCorrect);
        const isCorrect = correctOption ? answer.selectedOptionId === correctOption.optionText : false;
        answerRecords[i] = {
          ...answerRecords[i],
          isCorrect,
          pointsEarned: isCorrect ? question.points.toString() : '0',
        };
      }
    }

    // Filter out TRUE_FALSE records for insert (they don't have valid selectedOptionId)
    const recordsToInsert = answerRecords.filter(r => r.selectedOptionId !== undefined);

    await db.insert(examAnswers).values(recordsToInsert);

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
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Error al enviar examen' }, { status: 500 });
  }
}
