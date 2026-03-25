'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateDDMMYYYY } from '@/lib/utils';
import {
  getOfflineConflictDescription,
  getOfflineConflictStatusLabel,
  getOfflineConflictTitle,
} from '@/lib/exams/offline-conflict-copy';

interface ConflictItem {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  studentName: string | null;
  grade: number;
  schoolName: string | null;
  examTitle: string | null;
  sessionId: string;
  canResolveAutomatically: boolean;
}

export default function ResultConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isResolvingBatch, setIsResolvingBatch] = useState(false);

  async function loadConflicts() {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/results/conflicts', { cache: 'no-store' });
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching result conflicts:', error);
      setConflicts([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConflicts();
  }, []);

  const summary = useMemo(() => ({
    pending: conflicts.filter((conflict) => conflict.status === 'pending_review').length,
    resolved: conflicts.filter((conflict) => conflict.status === 'resolved').length,
    autoResolvable: conflicts.filter((conflict) => conflict.status === 'pending_review' && conflict.canResolveAutomatically).length,
  }), [conflicts]);

  async function handleResolveBatch() {
    setIsResolvingBatch(true);

    try {
      const response = await fetch('/api/admin/results/conflicts/resolve-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grade: 3 }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron resolver los conflictos en lote');
      }

      await loadConflicts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudieron resolver los conflictos en lote');
    } finally {
      setIsResolvingBatch(false);
    }
  }

  async function handleResolve(conflictId: string) {
    setResolvingId(conflictId);

    try {
      const response = await fetch(`/api/admin/results/conflicts/${conflictId}/resolve`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo resolver el conflicto');
      }

      await loadConflicts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo resolver el conflicto');
    } finally {
      setResolvingId(null);
    }
  }

  async function handleResolveManual(conflictId: string) {
    setResolvingId(conflictId);

    try {
      const response = await fetch(`/api/admin/results/conflicts/${conflictId}/resolve-manual`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo marcar el conflicto como revisado manualmente');
      }

      await loadConflicts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo marcar el conflicto como revisado manualmente');
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conflictos de resultados</h1>
          <p className="text-gray-600">Revisa y resuelve intentos offline que no pudieron cerrarse automaticamente.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/resultados">
            <Button variant="outline">Volver a resultados</Button>
          </Link>
          <Button
            type="button"
            onClick={() => void handleResolveBatch()}
            disabled={isResolvingBatch || summary.autoResolvable === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isResolvingBatch ? 'Resolviendo...' : `Resolver todo lo posible (${summary.autoResolvable})`}
          </Button>
          <Button type="button" variant="outline" onClick={() => void loadConflicts()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">Pendientes de revision</p>
            <p className="text-3xl font-semibold text-amber-950">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <p className="text-sm text-emerald-800">Resueltos</p>
            <p className="text-3xl font-semibold text-emerald-950">{summary.resolved}</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50 md:col-span-2">
          <CardContent className="pt-6">
            <p className="text-sm text-sky-800">Se pueden resolver automaticamente</p>
            <p className="text-3xl font-semibold text-sky-950">{summary.autoResolvable}</p>
            <p className="mt-2 text-sm text-sky-900">Los demas siguen necesitando el snapshot original del examen para poder calificarse sin riesgo.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Cola de revision
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Cargando conflictos...</div>
          ) : conflicts.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              No hay conflictos registrados.
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${conflict.status === 'resolved' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : conflict.status === 'resolved_manual' ? 'border-slate-200 bg-slate-100 text-slate-800' : 'border-sky-200 bg-sky-100 text-sky-800'}`}>
                          {getOfflineConflictStatusLabel(conflict.status)}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{getOfflineConflictTitle(conflict.reason)}</span>
                      </div>

                      <p className="text-sm text-slate-600">{getOfflineConflictDescription(conflict.reason)}</p>

                      <div className="grid gap-1 text-sm text-slate-700 md:grid-cols-2">
                        <p><span className="font-medium">Estudiante:</span> {conflict.studentName || 'N/A'}</p>
                        <p><span className="font-medium">Escuela:</span> {conflict.schoolName || 'N/A'}</p>
                        <p><span className="font-medium">Examen:</span> {conflict.examTitle || 'N/A'}</p>
                        <p><span className="font-medium">Grado:</span> {conflict.grade}o</p>
                        <p><span className="font-medium">Detectado:</span> {formatDateDDMMYYYY(conflict.createdAt)}</p>
                        <p><span className="font-medium">Ultima actualizacion:</span> {formatDateDDMMYYYY(conflict.updatedAt)}</p>
                      </div>
                      {!conflict.canResolveAutomatically && conflict.status === 'pending_review' && (
                        <p className="text-sm text-amber-700">Este caso no se puede resolver automaticamente porque la nube no recibio el snapshot completo del examen original.</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link href={`/resultados/${conflict.sessionId}`}>
                        <Button variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Button>
                      </Link>
                      {conflict.status === 'pending_review' && conflict.canResolveAutomatically && (
                        <Button
                          type="button"
                          onClick={() => void handleResolve(conflict.id)}
                          disabled={resolvingId === conflict.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {resolvingId === conflict.id ? 'Resolviendo...' : 'Resolver y finalizar'}
                        </Button>
                      )}
                      {conflict.status === 'pending_review' && !conflict.canResolveAutomatically && (
                        <Button
                          type="button"
                          onClick={() => void handleResolveManual(conflict.id)}
                          disabled={resolvingId === conflict.id}
                          variant="outline"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {resolvingId === conflict.id ? 'Marcando...' : 'Marcar revisado sin nota'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
