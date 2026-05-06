import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exams, offlineExamConflicts, schools, studentSessions } from '@/lib/db/schema';

export interface ResultsQueryFilters {
  grade?: string;
  school?: string;
  exam?: string;
  level?: string;
  name?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ResultListItem {
  id: string;
  name: string;
  grade: number;
  totalScore: string | null;
  performanceLevel: string | null;
  completedAt: Date | null;
  syncedAt: Date | null;
  displayDate: Date | null;
  reviewStatus: string | null;
  reviewReason: string | null;
  schoolName: string | null;
  examTitle: string | null;
}

export function parseResultsFilters(searchParams: URLSearchParams): ResultsQueryFilters {
  return {
    grade: searchParams.get('grade') || undefined,
    school: searchParams.get('school') || undefined,
    exam: searchParams.get('exam') || undefined,
    level: searchParams.get('level') || undefined,
    name: searchParams.get('name') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  };
}

export function getResultsVisibleAtExpression() {
  return sql`COALESCE(${studentSessions.completedAt}, ${studentSessions.syncedAt})`;
}

export function buildResultsWhereClause(filters: ResultsQueryFilters) {
  const visibleAt = getResultsVisibleAtExpression();
  const visibilityFilter = or(
    sql`${studentSessions.completedAt} IS NOT NULL`,
    eq(offlineExamConflicts.status, 'pending_review'),
  );

  const clauses: Array<ReturnType<typeof sql> | ReturnType<typeof eq> | ReturnType<typeof ilike> | ReturnType<typeof or>> = [];

  if (filters.grade) {
    const parsedGrade = parseInt(filters.grade, 10);
    if (!Number.isNaN(parsedGrade)) {
      clauses.push(eq(studentSessions.grade, parsedGrade));
    }
  }

  if (filters.school) {
    clauses.push(eq(studentSessions.schoolId, filters.school));
  }

  if (filters.exam) {
    clauses.push(eq(studentSessions.examId, filters.exam));
  }

  if (filters.level) {
    clauses.push(eq(studentSessions.performanceLevel, filters.level as 'ALTO' | 'MEDIO' | 'BAJO' | 'EXCELENTE' | 'INICIAL'));
  }

  if (filters.name) {
    clauses.push(ilike(studentSessions.name, `%${filters.name}%`));
  }

  if (filters.dateFrom) {
    clauses.push(sql`DATE(${visibleAt}) >= ${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    clauses.push(sql`DATE(${visibleAt}) <= ${filters.dateTo}`);
  }

  clauses.push(visibilityFilter);

  return and(...clauses);
}

export async function listResults(filters: ResultsQueryFilters, options?: { limit?: number; offset?: number }) {
  const visibleAt = getResultsVisibleAtExpression();
  const whereClause = buildResultsWhereClause(filters);

  const baseQuery = db
    .select({
      id: studentSessions.id,
      name: studentSessions.name,
      grade: studentSessions.grade,
      totalScore: studentSessions.totalScore,
      performanceLevel: studentSessions.performanceLevel,
      completedAt: studentSessions.completedAt,
      syncedAt: studentSessions.syncedAt,
      displayDate: visibleAt,
      reviewStatus: offlineExamConflicts.status,
      reviewReason: offlineExamConflicts.reason,
      schoolName: schools.name,
      examTitle: exams.title,
    })
    .from(studentSessions)
    .leftJoin(schools, eq(studentSessions.schoolId, schools.id))
    .leftJoin(exams, eq(studentSessions.examId, exams.id))
    .leftJoin(offlineExamConflicts, eq(studentSessions.id, offlineExamConflicts.sessionId))
    .where(whereClause)
    .orderBy(desc(visibleAt));

  if (typeof options?.limit === 'number' && typeof options?.offset === 'number') {
    return baseQuery.limit(options.limit).offset(options.offset) as Promise<ResultListItem[]>;
  }

  return baseQuery as Promise<ResultListItem[]>;
}

export async function countResults(filters: ResultsQueryFilters) {
  const whereClause = buildResultsWhereClause(filters);

  const [totalResult] = await db
    .select({ count: sql<number>`count(distinct ${studentSessions.id})` })
    .from(studentSessions)
    .leftJoin(offlineExamConflicts, eq(studentSessions.id, offlineExamConflicts.sessionId))
    .where(whereClause);

  return Number(totalResult?.count || 0);
}

export async function listResultExams() {
  return db
    .select({
      id: exams.id,
      title: exams.title,
      grade: exams.grade,
    })
    .from(exams)
    .orderBy(exams.grade, exams.title);
}

export function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}
