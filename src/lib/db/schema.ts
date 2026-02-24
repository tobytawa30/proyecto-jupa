import { pgTable, text, timestamp, uuid, boolean, integer, decimal, pgEnum, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'EDITOR']);
export const questionTypeEnum = pgEnum('question_type', ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING']);
export const sessionTypeEnum = pgEnum('session_type', ['EXAM', 'SURVEY', 'BOTH']);
export const performanceLevelEnum = pgEnum('performance_level', ['ALTO', 'MEDIO', 'BAJO', 'EXCELENTE', 'INICIAL']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('EDITOR'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exams = pgTable('exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  grade: integer('grade').notNull(),
  storyTitle: text('story_title').notNull(),
  storyContent: text('story_content').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  totalPoints: decimal('total_points', { precision: 5, scale: 2 }).notNull().default('0'),
  rubricConfig: jsonb('rubric_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  section: text('section'),
  sectionTitle: text('section_title'),
  questionText: text('question_text').notNull(),
  questionType: questionTypeEnum('question_type').notNull(),
  orderIndex: integer('order_index').notNull(),
  points: decimal('points', { precision: 4, scale: 2 }).notNull().default('1'),
  helperText: text('helper_text'),
  contextText: text('context_text'),
});

export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  optionLabel: varchar('option_label', { length: 10 }).notNull(),
  optionText: text('option_text').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  orderIndex: integer('order_index').notNull(),
});

export const surveys = pgTable('surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const surveySections = pgTable('survey_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
});

export const surveyQuestions = pgTable('survey_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').notNull().references(() => surveySections.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type').notNull(),
  options: jsonb('options').notNull(),
  orderIndex: integer('order_index').notNull(),
  required: boolean('required').notNull().default(false),
});

export const studentSessions = pgTable('student_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  grade: integer('grade').notNull(),
  examId: uuid('exam_id').references(() => exams.id),
  surveyId: uuid('survey_id').references(() => surveys.id),
  sessionType: sessionTypeEnum('session_type').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  totalScore: decimal('total_score', { precision: 5, scale: 2 }),
  performanceLevel: performanceLevelEnum('performance_level'),
  localStorageBackup: jsonb('local_storage_backup'),
});

export const examAnswers = pgTable('exam_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => studentSessions.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  selectedOptionId: uuid('selected_option_id').references(() => questionOptions.id),
  isCorrect: boolean('is_correct'),
  pointsEarned: decimal('points_earned', { precision: 4, scale: 2 }),
});

export const surveyAnswers = pgTable('survey_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => studentSessions.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => surveyQuestions.id, { onDelete: 'cascade' }),
  selectedOptions: jsonb('selected_options'),
  textResponse: text('text_response'),
});

export const examsRelations = relations(exams, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ many }) => ({
  sections: many(surveySections),
}));

export const surveySectionsRelations = relations(surveySections, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveySections.surveyId],
    references: [surveys.id],
  }),
  questions: many(surveyQuestions),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one }) => ({
  section: one(surveySections, {
    fields: [surveyQuestions.sectionId],
    references: [surveySections.id],
  }),
}));

export const studentSessionsRelations = relations(studentSessions, ({ one, many }) => ({
  school: one(schools, {
    fields: [studentSessions.schoolId],
    references: [schools.id],
  }),
  exam: one(exams, {
    fields: [studentSessions.examId],
    references: [exams.id],
  }),
  survey: one(surveys, {
    fields: [studentSessions.surveyId],
    references: [surveys.id],
  }),
  examAnswers: many(examAnswers),
  surveyAnswers: many(surveyAnswers),
}));

export const examAnswersRelations = relations(examAnswers, ({ one }) => ({
  session: one(studentSessions, {
    fields: [examAnswers.sessionId],
    references: [studentSessions.id],
  }),
  question: one(questions, {
    fields: [examAnswers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(questionOptions, {
    fields: [examAnswers.selectedOptionId],
    references: [questionOptions.id],
  }),
}));

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  session: one(studentSessions, {
    fields: [surveyAnswers.sessionId],
    references: [studentSessions.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveySection = typeof surveySections.$inferSelect;
export type NewSurveySection = typeof surveySections.$inferInsert;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type NewSurveyQuestion = typeof surveyQuestions.$inferInsert;
export type StudentSession = typeof studentSessions.$inferSelect;
export type NewStudentSession = typeof studentSessions.$inferInsert;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type NewExamAnswer = typeof examAnswers.$inferInsert;
export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
export type NewSurveyAnswer = typeof surveyAnswers.$inferInsert;
