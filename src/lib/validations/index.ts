import { z } from 'zod';

export const studentEntrySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  schoolId: z.string().uuid('Escuela inválida'),
  grade: z.number().int().min(1).max(4),
});

export const examAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().optional(),
  textAnswer: z.string().optional(),
});

export const submitExamSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(examAnswerSchema),
});

export const examSubmissionSchema = z.object({
  studentName: z.string().min(1),
  schoolId: z.string().uuid(),
  grade: z.number().int().min(1).max(4),
  examId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionId: z.string().uuid().optional(),
    })
  ),
});

export const surveySubmissionSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptions: z.array(z.string()).optional(),
      textResponse: z.string().optional(),
    })
  ),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const examSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  grade: z.number().int().min(1).max(4),
  storyTitle: z.string().min(1, 'El título del cuento es requerido'),
  storyContent: z.string().min(1, 'El contenido del cuento es requerido'),
  isActive: z.boolean().default(false),
  totalPoints: z.number().min(0).optional(),
});

export const questionSchema = z.object({
  examId: z.string().uuid(),
  section: z.string().optional(),
  sectionTitle: z.string().optional(),
  questionText: z.string().min(1, 'La pregunta es requerida'),
  questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING']),
  orderIndex: z.number().int().min(0),
  points: z.number().min(0).default(1),
  helperText: z.string().optional(),
  contextText: z.string().optional(),
});

export const questionOptionSchema = z.object({
  questionId: z.string().uuid(),
  optionLabel: z.string().min(1),
  optionText: z.string().min(1),
  isCorrect: z.boolean().default(false),
  orderIndex: z.number().int().min(0),
});

export const schoolSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
});

export type StudentEntry = z.infer<typeof studentEntrySchema>;
export type ExamSubmission = z.infer<typeof examSubmissionSchema>;
export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ExamForm = z.infer<typeof examSchema>;
export type QuestionForm = z.infer<typeof questionSchema>;
export type QuestionOptionForm = z.infer<typeof questionOptionSchema>;
export type SchoolForm = z.infer<typeof schoolSchema>;
