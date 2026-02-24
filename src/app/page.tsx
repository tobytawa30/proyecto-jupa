'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface School {
  id: string;
  name: string;
  code: string;
}

interface Exam {
  id: string;
  title: string;
  grade: number;
  storyTitle: string;
  isActive: boolean;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [grade, setGrade] = useState<string>('');
  const [schools, setSchools] = useState<School[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [schoolsRes, examsRes] = await Promise.all([
          fetch('/api/schools'),
          fetch('/api/exams'),
        ]);

        const schoolsData = await schoolsRes.json();
        const examsData = await examsRes.json();

        setSchools(schoolsData);
        setExams(examsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !schoolId || !grade) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const gradeNum = parseInt(grade);
      const examForGrade = exams.find((exam) => exam.grade === gradeNum);

      if (!examForGrade) {
        setError('No hay examen disponible para este grado');
        setIsSubmitting(false);
        return;
      }

      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: name,
          schoolId,
          grade: gradeNum,
          examId: examForGrade.id,
          sessionType: 'EXAM',
        }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        throw new Error(sessionData.error || 'Error al crear sesión');
      }

      router.push(`/examen/${examForGrade.id}?sessionId=${sessionData.sessionId}&name=${encodeURIComponent(name)}`);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-900">
            ¡Bienvenido a JUPA Digital!
          </CardTitle>
          <CardDescription>
            Ingresa tus datos para comenzar el examen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Escribe tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">Tu escuela</Label>
              <Select value={schoolId} onValueChange={setSchoolId} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecciona tu escuela" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Tu grado</Label>
              <Select value={grade} onValueChange={setGrade} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecciona tu grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º Grado</SelectItem>
                  <SelectItem value="2">2º Grado</SelectItem>
                  <SelectItem value="3">3º Grado</SelectItem>
                  <SelectItem value="4">4º Grado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Iniciando...' : 'Comenzar Examen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
