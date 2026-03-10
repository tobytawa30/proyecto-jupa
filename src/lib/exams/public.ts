import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exams, questionOptions, questions } from '@/lib/db/schema';

export interface PublicExamQuestionOption {
  id: string;
  optionLabel: string;
  optionText: string;
}

export interface PublicExamQuestion {
  id: string;
  section: string | null;
  sectionTitle: string | null;
  questionText: string;
  questionType: string;
  orderIndex: number;
  points: string;
  helperText: string | null;
  contextText: string | null;
  options: PublicExamQuestionOption[];
}

export interface PublicExam {
  id: string;
  title: string;
  grade: number;
  storyTitle: string;
  storyContent: string;
  isActive: boolean;
  totalPoints: string;
  createdAt: Date;
  updatedAt: Date;
  questions: PublicExamQuestion[];
}

export async function getPublicExamById(id: string): Promise<PublicExam | null> {
  const [exam] = await db.select().from(exams).where(eq(exams.id, id)).limit(1);

  if (!exam) {
    return null;
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
    examQuestions.map(async (question) => {
      const options = await db
        .select({
          id: questionOptions.id,
          optionLabel: questionOptions.optionLabel,
          optionText: questionOptions.optionText,
        })
        .from(questionOptions)
        .where(eq(questionOptions.questionId, question.id))
        .orderBy(asc(questionOptions.orderIndex));

      return {
        ...question,
        options,
      };
    })
  );

  return {
    ...exam,
    questions: questionsWithOptions,
  };
}

export async function getActiveExamManifestItems() {
  return db
    .select({
      id: exams.id,
      title: exams.title,
      grade: exams.grade,
      storyTitle: exams.storyTitle,
      isActive: exams.isActive,
      totalPoints: exams.totalPoints,
      updatedAt: exams.updatedAt,
    })
    .from(exams)
    .where(eq(exams.isActive, true))
    .orderBy(exams.grade);
}
