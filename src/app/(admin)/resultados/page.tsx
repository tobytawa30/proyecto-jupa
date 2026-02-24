'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';

interface Result {
  id: string;
  name: string;
  grade: number;
  totalScore: string;
  performanceLevel: string;
  completedAt: Date | null;
  schoolName: string | null;
  examTitle: string | null;
}

interface School {
  id: string;
  name: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/schools').then(r => r.json()),
    ]).then(([schoolsData]) => {
      setSchools(schoolsData);
    });
  }, []);

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (school) params.set('school', school);
      
      try {
        const res = await fetch(`/api/admin/results?${params}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [grade, school]);

  const handleExport = () => {
    const csvContent = [
      ['Nombre', 'Escuela', 'Grado', 'Examen', 'Puntaje', 'Nivel', 'Fecha'].join(','),
      ...results.map((r) =>
        [
          r.name,
          r.schoolName || '',
          r.grade,
          r.examTitle || '',
          r.totalScore || '',
          r.performanceLevel || '',
          r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-ES') : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resultados-examenes.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resultados</h1>
          <p className="text-gray-600">Visualiza los resultados de los exámenes</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="1">1º Grado</SelectItem>
                <SelectItem value="2">2º Grado</SelectItem>
                <SelectItem value="3">3º Grado</SelectItem>
                <SelectItem value="4">4º Grado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={school} onValueChange={setSchool}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las escuelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay resultados disponibles
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Estudiante</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Escuela</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Grado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Examen</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Puntaje</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Nivel</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{result.name}</td>
                      <td className="py-3 px-4">{result.schoolName || 'N/A'}</td>
                      <td className="py-3 px-4">{result.grade}º</td>
                      <td className="py-3 px-4">{result.examTitle || 'N/A'}</td>
                      <td className="py-3 px-4">{result.totalScore || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.performanceLevel === 'ALTO' || result.performanceLevel === 'EXCELENTE'
                              ? 'bg-green-100 text-green-700'
                              : result.performanceLevel === 'MEDIO'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {result.performanceLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {result.completedAt
                          ? new Date(result.completedAt).toLocaleDateString('es-ES')
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
