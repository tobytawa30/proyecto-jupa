import type { OfflineExamEvidenceSummary } from '@/lib/offline/types';

interface EvidenceExamQuestion {
  id: string;
  questionText: string;
  questionType: string;
  points: number | string;
  section?: string | null;
  options: Array<{
    id: string;
    optionLabel: string;
    optionText: string;
    isCorrect?: boolean;
  }>;
}

interface EvidenceExam {
  id: string;
  title: string;
  storyTitle: string;
  questions: EvidenceExamQuestion[];
}

export function hasEvidenceReadyExam(payload: unknown): payload is EvidenceExam {
  return Boolean(
    payload
    && typeof payload === 'object'
    && 'questions' in payload
    && Array.isArray((payload as { questions?: unknown[] }).questions)
  );
}

export function buildOfflineExamEvidenceSummary(exam: EvidenceExam, answers: Record<string, string>): OfflineExamEvidenceSummary {
  return {
    examId: exam.id,
    examTitle: exam.title,
    storyTitle: exam.storyTitle,
    generatedAt: new Date().toISOString(),
    questions: exam.questions.map((question) => {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.options.find((option) => option.id === selectedOptionId);

      return {
        questionId: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        points: String(question.points),
        section: question.section,
        selectedOptionId,
        selectedOptionLabel: selectedOption?.optionLabel,
        selectedOptionText: selectedOption?.optionText,
        options: question.options.map((option) => ({
          id: option.id,
          optionLabel: option.optionLabel,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
        })),
      };
    }),
  };
}
