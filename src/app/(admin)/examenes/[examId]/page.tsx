'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';

interface QuestionOption {
  id?: string;
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;
  section?: string;
  sectionTitle?: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING';
  orderIndex: number;
  points: number;
  helperText?: string;
  contextText?: string;
  options: QuestionOption[];
}

interface Exam {
  id?: string;
  title: string;
  grade: number;
  storyTitle: string;
  storyContent: string;
  isActive: boolean;
  totalPoints: string;
  questions: Question[];
}

export default function ExamEditorPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const isNew = examId === 'nuevo';

  const [exam, setExam] = useState<Exam>({
    title: '',
    grade: 1,
    storyTitle: '',
    storyContent: '',
    isActive: false,
    totalPoints: '0',
    questions: [],
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/admin/exams/${examId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.questions) {
            data.questions = data.questions.map((q: any) => ({
              ...q,
              options: q.options || [],
            }));
          }
          setExam(data);
        })
        .catch(() => setError('Error al cargar examen'))
        .finally(() => setIsLoading(false));
    }
  }, [examId, isNew]);

  const addQuestion = () => {
    const newQuestion: Question = {
      questionText: '',
      questionType: 'MULTIPLE_CHOICE',
      orderIndex: exam.questions.length,
      points: 1,
      options: [
        { optionLabel: 'A', optionText: '', isCorrect: false },
        { optionLabel: 'B', optionText: '', isCorrect: false },
        { optionLabel: 'C', optionText: '', isCorrect: false },
      ],
    };
    setExam((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      ),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qi) => {
        if (qi !== questionIndex) return q;
        const newOptions = q.options.map((o, oi) => {
          if (oi !== optionIndex) return o;
          return { ...o, [field]: value };
        });
        return { ...q, options: newOptions };
      }),
    }));
  };

  const addOption = (questionIndex: number) => {
    const question = exam.questions[questionIndex];
    const label = String.fromCharCode(65 + question.options.length);
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...q.options, { optionLabel: label, optionText: '', isCorrect: false }] }
          : q
      ),
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
          : q
      ),
    }));
  };

  const removeQuestion = (index: number) => {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const calculateTotalPoints = () => {
    return exam.questions.reduce((sum, q) => sum + parseFloat(String(q.points || 0)), 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/admin/exams' : `/api/admin/exams/${examId}`;
      
      const totalPoints = calculateTotalPoints();
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...exam, totalPoints: totalPoints.toString() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      router.push('/examenes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuevo Examen' : 'Editar Examen'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Examen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
                placeholder="Evaluación AD 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Grado</Label>
              <Select
                value={exam.grade.toString()}
                onValueChange={(v) => setExam({ ...exam, grade: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º Grado</SelectItem>
                  <SelectItem value="2">2º Grado</SelectItem>
                  <SelectItem value="3">3º Grado</SelectItem>
                  <SelectItem value="4">4º Grado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título del Cuento</Label>
            <Input
              value={exam.storyTitle}
              onChange={(e) => setExam({ ...exam, storyTitle: e.target.value })}
              placeholder="El gran día de los cuentos"
            />
          </div>

          <div className="space-y-2">
            <Label>Contenido del Cuento</Label>
            <Textarea
              value={exam.storyContent}
              onChange={(e) => setExam({ ...exam, storyContent: e.target.value })}
              placeholder="Escribe el cuento aquí..."
              rows={10}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={exam.isActive}
              onCheckedChange={(checked) => setExam({ ...exam, isActive: !!checked })}
            />
            <Label htmlFor="isActive">Examen activo</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Preguntas ({exam.questions.length})</CardTitle>
          <div className="text-sm text-gray-500">
            Puntaje total: {calculateTotalPoints()} pts
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {exam.questions.map((question, qIndex) => (
            <div key={qIndex} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Sección</Label>
                      <Input
                        value={question.section || ''}
                        onChange={(e) => updateQuestion(qIndex, 'section', e.target.value)}
                        placeholder="Parte 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={question.questionType}
                        onValueChange={(v) => updateQuestion(qIndex, 'questionType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MULTIPLE_CHOICE">Selección Múltiple</SelectItem>
                          <SelectItem value="TRUE_FALSE">Verdadero/Falso</SelectItem>
                          <SelectItem value="MATCHING">Relacionar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Puntos</Label>
                      <Input
                        type="number"
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseFloat(e.target.value))}
                        min={0}
                        step={0.5}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pregunta</Label>
                    <Textarea
                      value={question.questionText}
                      onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                      placeholder="Escribe la pregunta..."
                    />
                  </div>

                  {question.questionType === 'MATCHING' && (
                    <div className="space-y-2">
                      <Label>Texto de referencia (para relacionar)</Label>
                      <Textarea
                        value={question.contextText || ''}
                        onChange={(e) => updateQuestion(qIndex, 'contextText', e.target.value)}
                        placeholder="Texto que el estudiante debe relacionar con las opciones..."
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 ml-4"
                  onClick={() => removeQuestion(qIndex)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {question.questionType === 'TRUE_FALSE' ? (
                <div className="space-y-2">
                  <Label>Respuesta Correcta</Label>
                  <Select
                    value={question.options.find(o => o.isCorrect)?.optionText || ''}
                    onValueChange={(v) => {
                      const newOptions = question.options.map(o => ({
                        ...o,
                        isCorrect: o.optionText === v,
                      }));
                      updateQuestion(qIndex, 'options', newOptions);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Verdadero">Verdadero</SelectItem>
                      <SelectItem value="Falso">Falso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Opciones de Respuesta</Label>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => {
                            const newOptions = question.options.map((o, i) => ({
                              ...o,
                              isCorrect: i === oIndex ? !!checked : false,
                            }));
                            updateQuestion(qIndex, 'options', newOptions);
                          }}
                        />
                        <Input
                          className="w-12 text-center font-bold"
                          value={option.optionLabel}
                          onChange={(e) => updateOption(qIndex, oIndex, 'optionLabel', e.target.value)}
                          placeholder="A"
                        />
                        <Input
                          className="flex-1"
                          value={option.optionText}
                          onChange={(e) => updateOption(qIndex, oIndex, 'optionText', e.target.value)}
                          placeholder={`Opción ${option.optionLabel}`}
                        />
                        {question.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Opción
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Pregunta
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar Examen'}
        </Button>
      </div>
    </div>
  );
}
