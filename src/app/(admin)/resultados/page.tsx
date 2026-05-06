'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Eye, RotateCcw, Search } from 'lucide-react';
import { getOfflineConflictDescription, getOfflineConflictStatusLabel } from '@/lib/exams/offline-conflict-copy';
import { formatDateDDMMYYYY } from '@/lib/utils';

interface Result {
  id: string;
  name: string;
  grade: number;
  totalScore: string | null;
  performanceLevel: string | null;
  completedAt: string | null;
  syncedAt: string | null;
  displayDate: string | null;
  reviewStatus: string | null;
  reviewReason: string | null;
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

function getResultStatus(result: Result) {
  if (result.reviewStatus === 'pending_review') {
    return {
      label: getOfflineConflictStatusLabel(result.reviewStatus),
      className: 'bg-sky-100 text-sky-800 border-sky-200',
    };
  }

  if (result.reviewStatus === 'resolved_manual') {
    return {
      label: getOfflineConflictStatusLabel(result.reviewStatus),
      className: 'bg-slate-100 text-slate-800 border-slate-200',
    };
  }

  return {
    label: 'Finalizado',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [exams, setExams] = useState<ExamFilter[]>([]);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [exam, setExam] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
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
  }, [grade, school, exam, dateFrom, dateTo, debouncedSearch, page]);

  const handleFilterReset = () => {
    setGrade('');
    setSchool('');
    setExam('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (school) params.set('school', school);
      if (exam) params.set('exam', exam);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (debouncedSearch) params.set('name', debouncedSearch);

      const response = await fetch(`/api/admin/results/export?${params.toString()}`);
      const payload = await response.json() as { csv?: string; fileName?: string; total?: number; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo exportar el CSV');
      }

      if (!payload.csv || !payload.total) {
        throw new Error('No hay resultados para exportar con los filtros actuales.');
      }

      const blob = new Blob([payload.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = payload.fileName || `resultados-examenes-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al exportar CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resultados</h1>
          <p className="text-gray-600">Visualiza los resultados de los exámenes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/resultados/conflictos">
            <Button variant="outline">Ver conflictos</Button>
          </Link>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(320px,1.4fr)_repeat(3,minmax(180px,1fr))]">
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
                  <SelectItem value={ALL_GRADES_VALUE}>Todos los grados</SelectItem>
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
                  <SelectItem value={ALL_SCHOOLS_VALUE}>Todas las escuelas</SelectItem>
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
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-[minmax(180px,220px)_minmax(180px,220px)_1fr] md:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Desde</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Hasta</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex justify-start md:justify-end">
                <button
                  type="button"
                  onClick={handleFilterReset}
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpiar filtros
                </button>
              </div>
            </div>
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
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Puntaje</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Nivel</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const status = getResultStatus(result);

                    return (
                      <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{result.name}</p>
                          <p className="text-xs text-slate-500">{result.grade}º grado</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{result.schoolName || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-700">{result.examTitle || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                              {status.label}
                            </span>
                            {result.reviewReason && (
                              <p className="text-xs text-slate-500">{getOfflineConflictDescription(result.reviewReason)}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {result.totalScore || (result.reviewStatus === 'pending_review' ? 'Pendiente' : 'N/A')}
                        </td>
                        <td className="py-3 px-4">
                          {result.performanceLevel ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelStyles(result.performanceLevel)}`}>
                              {result.performanceLevel}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {result.reviewStatus === 'pending_review' ? 'En revision' : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatDateDDMMYYYY(result.displayDate)}
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
                    );
                  })}
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
