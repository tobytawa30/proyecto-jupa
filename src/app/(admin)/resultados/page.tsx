'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Eye, RotateCcw, Search } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/utils';

interface Result {
  id: string;
  name: string;
  grade: number;
  totalScore: string;
  performanceLevel: string;
  completedAt: string | null;
  schoolName: string | null;
  examTitle: string | null;
}

interface School {
  id: string;
  name: string;
}

interface ExamFilter {
  id: string;
  title: string;
  grade: number;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const ALL_GRADES_VALUE = 'ALL_GRADES';
const ALL_SCHOOLS_VALUE = 'ALL_SCHOOLS';
const ALL_EXAMS_VALUE = 'ALL_EXAMS';
const ALL_LEVELS_VALUE = 'ALL_LEVELS';

const DEFAULT_PAGINATION: PaginationData = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

function getLevelStyles(level: string) {
  if (level === 'EXCELENTE' || level === 'ALTO') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (level === 'MEDIO') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [exams, setExams] = useState<ExamFilter[]>([]);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [exam, setExam] = useState('');
  const [level, setLevel] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/schools').then(r => r.json()),
    ]).then(([schoolsData]) => {
      setSchools(schoolsData);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (school) params.set('school', school);
      if (exam) params.set('exam', exam);
      if (level) params.set('level', level);
      if (date) params.set('date', date);
      if (debouncedSearch) params.set('name', debouncedSearch);
      params.set('page', page.toString());
      params.set('pageSize', '10');
      
      try {
        const res = await fetch(`/api/admin/results?${params}`);
        const data = await res.json();
        setResults(data.results || []);
        setExams(data.exams || []);
        setPagination(data.pagination || DEFAULT_PAGINATION);
      } catch (err) {
        console.error('Error fetching results:', err);
        setResults([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [grade, school, exam, level, date, debouncedSearch, page]);

  const handleFilterReset = () => {
    setGrade('');
    setSchool('');
    setExam('');
    setLevel('');
    setDate('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

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
          formatDateDDMMYYYY(r.completedAt),
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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por estudiante"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={grade || ALL_GRADES_VALUE}
              onValueChange={(value) => {
                setGrade(value === ALL_GRADES_VALUE ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_GRADES_VALUE}>Todos</SelectItem>
                <SelectItem value="1">1º Grado</SelectItem>
                <SelectItem value="2">2º Grado</SelectItem>
                <SelectItem value="3">3º Grado</SelectItem>
                <SelectItem value="4">4º Grado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={school || ALL_SCHOOLS_VALUE}
              onValueChange={(value) => {
                setSchool(value === ALL_SCHOOLS_VALUE ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las escuelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCHOOLS_VALUE}>Todas</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={exam || ALL_EXAMS_VALUE}
              onValueChange={(value) => {
                setExam(value === ALL_EXAMS_VALUE ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los exámenes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EXAMS_VALUE}>Todos los exámenes</SelectItem>
                {exams.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title} ({item.grade}º)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={level || ALL_LEVELS_VALUE}
              onValueChange={(value) => {
                setLevel(value === ALL_LEVELS_VALUE ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los niveles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LEVELS_VALUE}>Todos los niveles</SelectItem>
                <SelectItem value="EXCELENTE">Excelente</SelectItem>
                <SelectItem value="ALTO">Alto</SelectItem>
                <SelectItem value="MEDIO">Medio</SelectItem>
                <SelectItem value="BAJO">Bajo</SelectItem>
                <SelectItem value="INICIAL">Inicial</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={handleFilterReset}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-4 h-4" />
              Limpiar filtros
            </button>
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
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Estudiante</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Escuela</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Examen</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Puntaje</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Nivel</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{result.name}</p>
                        <p className="text-xs text-slate-500">{result.grade}º grado</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{result.schoolName || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-700">{result.examTitle || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{result.totalScore || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelStyles(result.performanceLevel || '')}`}>
                          {result.performanceLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDateDDMMYYYY(result.completedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/resultados/${result.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
