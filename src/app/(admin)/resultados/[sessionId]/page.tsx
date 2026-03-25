import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { ArrowLeft, CheckCircle2, CircleAlert, CircleOff, FileCheck2 } from 'lucide-react';
import { db } from '@/lib/db';
import { getOfflineConflictDescription, getOfflineConflictStatusLabel, getOfflineConflictTitle } from '@/lib/exams/offline-conflict-copy';
import { formatDateDDMMYYYY } from '@/lib/utils';
import {
  examAnswers,
  exams,
  offlineExamConflicts,
  questionOptions,
  questions,
  schools,
  studentSessions,
} from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [session] = await db
    .select({
      id: studentSessions.id,
      studentName: studentSessions.name,
      grade: studentSessions.grade,
      totalScore: studentSessions.totalScore,
      performanceLevel: studentSessions.performanceLevel,
      completedAt: studentSessions.completedAt,
      syncedAt: studentSessions.syncedAt,
      examId: studentSessions.examId,
      schoolName: schools.name,
      examTitle: exams.title,
      reviewStatus: offlineExamConflicts.status,
      reviewReason: offlineExamConflicts.reason,
      answersPayload: offlineExamConflicts.answersPayload,
      examSnapshotPayload: offlineExamConflicts.examSnapshotPayload,
      syncPayload: offlineExamConflicts.syncPayload,
    })
    .from(studentSessions)
    .leftJoin(schools, eq(studentSessions.schoolId, schools.id))
    .leftJoin(exams, eq(studentSessions.examId, exams.id))
    .leftJoin(offlineExamConflicts, eq(studentSessions.id, offlineExamConflicts.sessionId))
    .where(eq(studentSessions.id, sessionId))
    .limit(1);

  if (!session) {
    notFound();
  }

  if (!session.examId) {
    return (
      <div className="space-y-6">
        <Link href="/resultados" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Volver a resultados
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Detalle no disponible</CardTitle>
          </CardHeader>
          <CardContent>
            Esta sesión no está asociada a un examen.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [examQuestions, answers] = await Promise.all([
    db
      .select({
        id: questions.id,
        section: questions.section,
        questionText: questions.questionText,
        questionType: questions.questionType,
        points: questions.points,
        orderIndex: questions.orderIndex,
      })
      .from(questions)
      .where(eq(questions.examId, session.examId))
      .orderBy(asc(questions.orderIndex)),
    db
      .select({
        questionId: examAnswers.questionId,
        selectedOptionId: examAnswers.selectedOptionId,
        isCorrect: examAnswers.isCorrect,
        pointsEarned: examAnswers.pointsEarned,
        selectedOptionLabel: questionOptions.optionLabel,
        selectedOptionText: questionOptions.optionText,
      })
      .from(examAnswers)
      .leftJoin(questionOptions, eq(examAnswers.selectedOptionId, questionOptions.id))
      .where(eq(examAnswers.sessionId, sessionId)),
  ]);

  const questionIds = examQuestions.map((q) => q.id);
  const correctOptions = questionIds.length
    ? await db
        .select({
          questionId: questionOptions.questionId,
          optionLabel: questionOptions.optionLabel,
          optionText: questionOptions.optionText,
        })
        .from(questionOptions)
        .where(
          and(
            inArray(questionOptions.questionId, questionIds),
            eq(questionOptions.isCorrect, true),
          ),
        )
    : [];

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const correctOptionsMap = new Map<string, Array<{ optionLabel: string; optionText: string }>>();

  const snapshotExam = session.examSnapshotPayload && typeof session.examSnapshotPayload === 'object'
    ? session.examSnapshotPayload as {
        questions?: Array<{
          id: string;
          questionText: string;
          questionType?: string;
          section?: string | null;
          points?: string | number;
          options?: Array<{ id: string; optionLabel: string; optionText: string; isCorrect?: boolean }>;
        }>;
      }
    : null;
  const evidenceSummary = session.syncPayload && typeof session.syncPayload === 'object' && 'examEvidenceSummary' in session.syncPayload
    ? (session.syncPayload as {
        examEvidenceSummary?: {
          questions?: Array<{
            questionId: string;
            questionText: string;
            questionType?: string;
            section?: string | null;
            points?: string | number;
            selectedOptionId?: string;
            selectedOptionLabel?: string;
            selectedOptionText?: string;
            options?: Array<{ id: string; optionLabel: string; optionText: string; isCorrect?: boolean }>;
          }>;
        };
      }).examEvidenceSummary
    : null;
  const fallbackSnapshotExam = !snapshotExam && evidenceSummary?.questions
    ? {
        questions: evidenceSummary.questions.map((question) => ({
          id: question.questionId,
          questionText: question.questionText,
          questionType: question.questionType,
          section: question.section,
          points: question.points,
          options: question.options,
        })),
      }
    : snapshotExam;
  const snapshotAnswers = Array.isArray(session.answersPayload)
    ? session.answersPayload as Array<{ questionId: string; selectedOptionId?: string }>
    : [];
  const fallbackAnswers = snapshotAnswers.length > 0
    ? snapshotAnswers
    : evidenceSummary?.questions?.map((question) => ({
        questionId: question.questionId,
        selectedOptionId: question.selectedOptionId,
      })) || [];
  const snapshotAnswerMap = new Map(fallbackAnswers.map((answer) => [answer.questionId, answer.selectedOptionId]));

  for (const option of correctOptions) {
    const existing = correctOptionsMap.get(option.questionId) || [];
    existing.push({ optionLabel: option.optionLabel, optionText: option.optionText });
    correctOptionsMap.set(option.questionId, existing);
  }

  const answeredCount = examQuestions.filter((question) => answerMap.has(question.id)).length;
  const correctCount = Array.from(answerMap.values()).filter((answer) => answer.isCorrect === true).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detalle de resultado</h1>
          <p className="text-gray-600">Valida las respuestas del estudiante y su puntuación</p>
        </div>
        <Link href="/resultados" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver a resultados
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Preguntas del examen</p>
            <p className="text-2xl font-semibold text-slate-900">{examQuestions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Respuestas registradas</p>
            <p className="text-2xl font-semibold text-slate-900">{answeredCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Respuestas correctas</p>
            <p className="text-2xl font-semibold text-slate-900">{correctCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          {session.reviewStatus && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${session.reviewStatus === 'resolved' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : session.reviewStatus === 'resolved_manual' ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-sky-200 bg-sky-50 text-sky-900'}`}>
              <p className="font-semibold">{getOfflineConflictStatusLabel(session.reviewStatus)}: {getOfflineConflictTitle(session.reviewReason || '')}</p>
              <p className="mt-1">{getOfflineConflictDescription(session.reviewReason || '')}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <p><span className="font-medium">Estudiante:</span> {session.studentName}</p>
            <p><span className="font-medium">Escuela:</span> {session.schoolName || 'N/A'}</p>
            <p><span className="font-medium">Grado:</span> {session.grade}º</p>
            <p><span className="font-medium">Examen:</span> {session.examTitle || 'N/A'}</p>
            <p><span className="font-medium">Nivel:</span> {session.performanceLevel || 'N/A'}</p>
            <p><span className="font-medium">Puntaje total:</span> {session.totalScore || 'N/A'}</p>
            <p><span className="font-medium">Fecha:</span> {formatDateDDMMYYYY(session.completedAt || session.syncedAt)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-slate-700" />
            Respuestas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {answers.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay respuestas registradas para esta sesión. Si este examen es antiguo, puede venir de una versión previa sin trazabilidad completa.
            </div>
          )}

          {answers.length === 0 && fallbackSnapshotExam?.questions && fallbackSnapshotExam.questions.length > 0 && (
            <div className="space-y-4">
              {fallbackSnapshotExam.questions.map((question, index) => {
                const selectedValue = snapshotAnswerMap.get(question.id);
                const selectedOption = question.options?.find((option) => option.id === selectedValue || option.optionText.toLowerCase() === String(selectedValue || '').toLowerCase());
                const correctOptions = (question.options || []).filter((option) => option.isCorrect);

                return (
                  <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="font-medium text-gray-900">
                      {index + 1}. {question.questionText}
                    </p>
                    <p className="text-sm text-gray-500">
                      {question.section || 'Sin sección'} - {question.questionType || 'N/A'} - {question.points || '0'} pts
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Respuesta estudiante:</span>{' '}
                      {selectedOption ? `${selectedOption.optionLabel}. ${selectedOption.optionText}` : 'Sin respuesta'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Respuesta correcta:</span>{' '}
                      {correctOptions.length > 0
                        ? correctOptions.map((option) => `${option.optionLabel}. ${option.optionText}`).join(' | ')
                        : 'No definida'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {examQuestions.length === 0 && (!fallbackSnapshotExam?.questions || fallbackSnapshotExam.questions.length === 0) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Este examen no tiene preguntas disponibles en base de datos.
            </div>
          )}

          {answers.length > 0 && (
          <div className="space-y-4">
            {examQuestions.map((question, index) => {
              const answer = answerMap.get(question.id);
              const correctForQuestion = correctOptionsMap.get(question.id) || [];

              return (
                <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="font-medium text-gray-900">
                    {index + 1}. {question.questionText}
                  </p>
                  <p className="text-sm text-gray-500">
                    {question.section || 'Sin sección'} - {question.questionType} - {question.points} pts
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Respuesta estudiante:</span>{' '}
                    {answer?.selectedOptionText
                      ? `${answer.selectedOptionLabel}. ${answer.selectedOptionText}`
                      : 'Sin respuesta'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Respuesta correcta:</span>{' '}
                    {correctForQuestion.length > 0
                      ? correctForQuestion.map((option) => `${option.optionLabel}. ${option.optionText}`).join(' | ')
                      : 'No definida'}
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    {answer?.isCorrect === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : answer?.isCorrect === false ? (
                      <CircleOff className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CircleAlert className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-medium">Validación:</span>{' '}
                    {answer?.isCorrect === true
                      ? 'Correcta'
                      : answer?.isCorrect === false
                      ? 'Incorrecta'
                      : 'Pendiente'}
                    {' · '}
                    <span className="font-medium">Puntos:</span> {answer?.pointsEarned ?? '0'}
                  </p>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
