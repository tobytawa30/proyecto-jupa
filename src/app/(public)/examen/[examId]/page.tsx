'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">
                {exam.storyTitle}
              </h1>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
                {exam.storyContent}
              </div>
              <div className="text-center">
                <Button
                  onClick={() => setShowStory(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Pregunta {currentQuestionIndex + 1} de {exam.questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {studentName}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentQuestion && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {currentQuestion.sectionTitle && (
                <p className="text-sm font-medium text-blue-600 mb-2">
                  {currentQuestion.sectionTitle}
                </p>
              )}

              {currentQuestion.contextText && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-gray-700 italic">
                  "{currentQuestion.contextText}"
                </div>
              )}

              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion.questionText}
              </h2>

              {currentQuestion.questionType === 'TRUE_FALSE' ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value={option.optionText} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer flex-1">
                        {option.optionText}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer flex-1">
                        <span className="font-medium mr-2">{option.optionLabel})</span>
                        {option.optionText}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0}
                >
                  Anterior
                </Button>

                {currentQuestionIndex === exam.questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? 'Enviando...' : 'Terminar Examen'}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Siguiente
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {exam.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers[exam.questions[index].id]
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
