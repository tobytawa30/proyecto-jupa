import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { examAnswers, exams, questionOptions, questions, studentSessions } from '@/lib/db/schema';
import type { OfflineExamAnswerPayload } from '@/lib/offline/types';

function isUuid(value?: string) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function gradeAndStoreExamSubmission({
  sessionId,
  answers,
  completedAt,
  markSyncedAt,
}: {
  sessionId: string;
  answers: OfflineExamAnswerPayload[];
  completedAt?: Date;
  markSyncedAt?: Date;
}) {
  return db.transaction(async (tx) => {
    const [session] = await tx.select().from(studentSessions).where(eq(studentSessions.id, sessionId)).limit(1);

    if (!session) {
      throw new Error('Sesion no encontrada');
    }

    if (session.completedAt) {
      return {
        success: true,
        totalScore: Number(session.totalScore || 0),
        performanceLevel: session.performanceLevel,
        alreadyCompleted: true,
      };
    }

    const questionIds = answers.map((answer) => answer.questionId);
    const questionData = questionIds.length === 0
      ? []
      : await tx
          .select({
            id: questions.id,
            points: questions.points,
            questionType: questions.questionType,
          })
          .from(questions)
          .where(inArray(questions.id, questionIds));

    const questionMap = new Map(questionData.map((question) => [question.id, question]));

    const answeredOptions = answers.filter((answer) => answer.selectedOptionId);
    const answeredWithUuid = answeredOptions.filter((answer) => isUuid(answer.selectedOptionId));
    const answeredWithText = answeredOptions.filter((answer) => !isUuid(answer.selectedOptionId));

    let selectedOptions: Array<{
      id: string;
      isCorrect: boolean;
      questionId: string;
      optionText: string;
      optionLabel: string;
    }> = [];

    if (answeredWithUuid.length > 0) {
      const optionIds = answeredWithUuid.map((answer) => answer.selectedOptionId as string);
      selectedOptions = await tx
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

    let textMatchedOptions: typeof selectedOptions = [];

    if (answeredWithText.length > 0) {
      const textQuestionIds = Array.from(new Set(answeredWithText.map((answer) => answer.questionId)));
      textMatchedOptions = await tx
        .select({
          id: questionOptions.id,
          isCorrect: questionOptions.isCorrect,
          questionId: questionOptions.questionId,
          optionText: questionOptions.optionText,
          optionLabel: questionOptions.optionLabel,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, textQuestionIds));
    }

    const selectedOptionsMap = new Map(selectedOptions.map((option) => [option.id, option]));
    const textSelectedOptionsMap = new Map(
      textMatchedOptions.map((option) => [
        `${option.questionId}::${String(option.optionText).toLowerCase()}`,
        option,
      ])
    );

    const resolveSelectedOption = (answer: OfflineExamAnswerPayload) => {
      if (!answer.selectedOptionId) {
        return null;
      }

      if (isUuid(answer.selectedOptionId)) {
        return selectedOptionsMap.get(answer.selectedOptionId) || null;
      }

      return textSelectedOptionsMap.get(`${answer.questionId}::${String(answer.selectedOptionId).toLowerCase()}`) || null;
    };

    let totalScore = 0;

    for (const answer of answeredOptions) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        continue;
      }

      const selectedOption = resolveSelectedOption(answer);
      const isCorrect = selectedOption?.isCorrect ?? false;

      if (isCorrect) {
        totalScore += parseFloat(question.points.toString());
      }
    }

    const answerRecords = answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      const selectedOption = resolveSelectedOption(answer);
      const isCorrect = selectedOption?.isCorrect ?? false;
      const pointsEarned = isCorrect ? parseFloat(question?.points?.toString() || '0') : 0;

      return {
        sessionId,
        questionId: answer.questionId,
        selectedOptionId: isUuid(answer.selectedOptionId)
          ? answer.selectedOptionId
          : selectedOption?.id || undefined,
        isCorrect,
        pointsEarned: pointsEarned.toString(),
      };
    });

    const recordsToInsert = answerRecords.filter((record) => Boolean(record.selectedOptionId));

    await tx.delete(examAnswers).where(eq(examAnswers.sessionId, sessionId));

    if (recordsToInsert.length > 0) {
      await tx.insert(examAnswers).values(recordsToInsert);
    }

    const [examData] = await tx.select().from(exams).where(eq(exams.id, session.examId!)).limit(1);

    let performanceLevel: 'ALTO' | 'MEDIO' | 'BAJO' | null = null;
    if (examData?.totalPoints) {
      const totalPoints = parseFloat(examData.totalPoints.toString());
      const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

      if (percentage >= 80) {
        performanceLevel = 'ALTO';
      } else if (percentage >= 50) {
        performanceLevel = 'MEDIO';
      } else {
        performanceLevel = 'BAJO';
      }
    }

    await tx
      .update(studentSessions)
      .set({
        completedAt: completedAt || new Date(),
        totalScore: totalScore.toString(),
        performanceLevel,
        syncedAt: markSyncedAt,
      })
      .where(eq(studentSessions.id, sessionId));

    return {
      success: true,
      totalScore,
      performanceLevel,
      alreadyCompleted: false,
    };
  });
}
