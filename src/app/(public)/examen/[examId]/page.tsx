'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  section?: string;
  sectionTitle?: string;
  questionText: string;
  questionType: string;
  orderIndex: number;
  points: number;
  helperText?: string;
  contextText?: string;
  options: {
    id: string;
    optionLabel: string;
    optionText: string;
  }[];
}

interface Exam {
  id: string;
  title: string;
  grade: number;
  storyTitle: string;
  storyContent: string;
  isActive: boolean;
  totalPoints: string;
  questions: Question[];
}

export default function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const sessionId = searchParams.get('sessionId');
  const studentName = searchParams.get('name');

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStory, setShowStory] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchExam() {
      try {
        const res = await fetch(`/api/exams/${examId}`);
        if (!res.ok) throw new Error('Examen no encontrado');
        const data = await res.json();
        setExam(data);
      } catch (err) {
        setError('Error al cargar el examen');
      } finally {
        setIsLoading(false);
      }
    }

    fetchExam();
  }, [examId]);

  const currentQuestion = exam?.questions[currentQuestionIndex];
  const progress = exam ? ((currentQuestionIndex + 1) / exam.questions.length) * 100 : 0;

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] || '' : '';

  const handleNext = () => {
    if (currentQuestionIndex < (exam?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      setError('Sesión no válida');
      return;
    }

    const unanswered = exam?.questions.filter((q) => !answers[q.id]).length || 0;
    if (unanswered > 0) {
      if (!confirm(`¿Estás seguro de terminar? Hay ${unanswered} pregunta(s) sin responder.`)) {
        return;
      }
    }

    setIsSubmitting(true);

    console.log('Submitting exam:', { sessionId, answers });

    if (!sessionId) {
      setError('Sesión no válida. Por favor inicia el examen desde el inicio.');
      setIsSubmitting(false);
      return;
    }

    try {
      const answersArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: answersArray,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar respuestas');
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      });

      setTimeout(() => {
        router.push('/completo');
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting exam:', err);
      setError(err.message || 'Error al enviar el examen. Intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Examen no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showStory) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff8e7_0%,#eef7ff_55%,#ffffff_100%)] p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden border-amber-200/80 bg-white/95 shadow-[0_20px_60px_rgba(14,116,144,0.12)]">
            <CardContent className="p-6 md:p-8 lg:p-10">
              <div className="mb-6 flex items-center justify-center">
                <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-800">
                  Tiempo de lectura
                </span>
              </div>
              <h1 className="mb-4 text-center text-3xl font-bold tracking-tight text-sky-950 md:text-4xl">
                {exam.storyTitle}
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-center text-base text-slate-600 md:text-lg">
                Lee con calma. Cuando termines, el cuento seguira visible mientras respondes.
              </p>
              <div className="mb-8 whitespace-pre-wrap rounded-3xl bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 text-lg leading-9 text-slate-700 shadow-inner md:p-8 md:text-xl">
                {exam.storyContent}
              </div>
              <div className="text-center">
                <Button
                  onClick={() => setShowStory(false)}
                  className="h-14 rounded-full bg-emerald-600 px-8 text-lg font-semibold shadow-lg transition-transform hover:bg-emerald-700 hover:scale-[1.01]"
                >
                  Comenzar a Responder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4fbff_0%,#fffaf0_45%,#ffffff_100%)] p-3 md:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 rounded-2xl border border-sky-100 bg-white/90 p-3 shadow-sm md:mb-4 md:p-4">
          <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Examen de lectura</p>
              <h1 className="text-lg font-bold text-slate-900 md:text-xl">{exam.storyTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 md:justify-end md:text-sm">
              {studentName && <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-800">{studentName}</span>}
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                Pregunta {currentQuestionIndex + 1} de {exam.questions.length}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="mt-3 rounded-2xl bg-slate-50/90 p-2.5 md:p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600 md:text-sm">Navega por las preguntas</p>
              <span className="hidden text-[11px] font-medium text-slate-500 md:inline md:text-xs">Toca un numero para cambiar</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {exam.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors md:h-10 md:w-10 md:text-sm',
                    index === currentQuestionIndex
                      ? 'bg-sky-600 text-white shadow-md'
                      : answers[exam.questions[index].id]
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-start lg:gap-6">
          <Card className="order-1 overflow-hidden border-amber-200/80 bg-white/95 shadow-[0_20px_50px_rgba(14,116,144,0.10)]">
            <CardContent className="p-0">
              <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-sky-50 px-5 py-4 md:px-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Cuento</p>
                <p className="mt-1 text-base text-slate-600 md:text-lg">Puedes volver a leerlo mientras respondes.</p>
              </div>
              <div className="max-h-[38vh] overflow-y-auto px-5 py-5 text-base leading-8 text-slate-700 whitespace-pre-wrap md:max-h-[72vh] md:px-6 md:py-6 md:text-lg md:leading-9">
                {exam.storyContent}
              </div>
            </CardContent>
          </Card>

          <div className="order-2">
            {currentQuestion && (
              <Card className="overflow-hidden border-sky-200 bg-white/95 shadow-[0_20px_50px_rgba(59,130,246,0.12)]">
                <CardContent className="p-5 md:p-6">
                  {currentQuestion.sectionTitle && (
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                      {currentQuestion.sectionTitle}
                    </p>
                  )}

                  {currentQuestion.contextText && (
                    <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-base italic leading-7 text-slate-700">
                      "{currentQuestion.contextText}"
                    </div>
                  )}

                  <h2 className="mb-6 text-2xl font-bold leading-tight text-slate-900 md:text-[1.75rem]">
                    {currentQuestion.questionText}
                  </h2>

                  <RadioGroup
                    value={selectedOptionId}
                    onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedOptionId === option.id;

                      return (
                        <Label
                          key={option.id}
                          htmlFor={option.id}
                          className={cn(
                            'flex w-full cursor-pointer items-start gap-4 rounded-3xl border-2 p-4 transition-all md:p-5',
                            'hover:border-sky-300 hover:bg-sky-50/70 active:scale-[0.99]',
                            'focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100',
                            isSelected
                              ? 'border-sky-500 bg-sky-50 shadow-[0_10px_30px_rgba(59,130,246,0.14)]'
                              : 'border-slate-200 bg-white'
                          )}
                        >
                          <RadioGroupItem value={option.id} id={option.id} className="mt-1 h-5 w-5 shrink-0" />
                          <div className="flex flex-1 items-center gap-3">
                            {currentQuestion.questionType !== 'TRUE_FALSE' && (
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base font-bold text-amber-800">
                                {option.optionLabel}
                              </span>
                            )}
                            <p className="text-base font-medium leading-7 text-slate-800 md:text-lg md:leading-8">
                              {option.optionText}
                            </p>
                          </div>
                        </Label>
                      );
                    })}
                  </RadioGroup>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      disabled={currentQuestionIndex === 0}
                      className="h-12 rounded-full px-6 text-base"
                    >
                      Anterior
                    </Button>

                    {currentQuestionIndex === exam.questions.length - 1 ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-12 rounded-full bg-emerald-600 px-6 text-base hover:bg-emerald-700"
                      >
                        {isSubmitting ? 'Enviando...' : 'Terminar Examen'}
                      </Button>
                    ) : (
                      <Button onClick={handleNext} className="h-12 rounded-full bg-sky-600 px-6 text-base hover:bg-sky-700">
                        Siguiente
                      </Button>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
