'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCachedSchools, getAllCachedExams, saveCachedExamPayload, saveOfflineManifest } from '@/lib/offline/cache-repository';
import { createOfflineAttempt, listOfflineAttempts } from '@/lib/offline/attempt-repository';
import { isBrowserOnline, subscribeToConnectivityChange } from '@/lib/offline/connectivity';
import { createOfflineAttemptId, getOrCreateDeviceId } from '@/lib/offline/ids';
import { enqueueExamSync, getAllQueueJobs } from '@/lib/offline/sync-queue';
import { runAllPendingSyncJobs, runExamSyncJob } from '@/lib/offline/sync-runner';
import type { CachedExamManifestItem, OfflineCacheManifest, OfflineAttemptRecord } from '@/lib/offline/types';

interface School {
  id: string;
  name: string;
  code: string;
}

type Exam = CachedExamManifestItem;

function hasFullExamPayload(payload: unknown): payload is Exam & { questions: unknown[] } {
  return Boolean(payload && typeof payload === 'object' && 'questions' in payload && Array.isArray((payload as { questions?: unknown[] }).questions));
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
  const [isPreparingOffline, setIsPreparingOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cachedExamCount, setCachedExamCount] = useState(0);
  const [expectedOfflineExamCount, setExpectedOfflineExamCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [resumableAttempt, setResumableAttempt] = useState<OfflineAttemptRecord | null>(null);
  const [deviceAttempts, setDeviceAttempts] = useState<OfflineAttemptRecord[]>([]);

  const refreshLocalState = useCallback(async () => {
    const [cachedSchools, cachedExams, jobs, attempts] = await Promise.all([
      getCachedSchools(),
      getAllCachedExams(),
      getAllQueueJobs(),
      listOfflineAttempts(),
    ]);

    if (cachedSchools?.schools?.length) {
      setSchools(cachedSchools.schools);
      setExpectedOfflineExamCount(cachedSchools.expectedExamIds?.length || 0);
    }

    if (cachedExams.length > 0) {
      setExams(cachedExams.map((record) => record.payload as Exam));
    }

    setCachedExamCount(cachedExams.filter((record) => hasFullExamPayload(record.payload)).length);
    setPendingSyncCount(jobs.length);

    const draftAttempt = attempts
      .filter((attempt) => attempt.status === 'draft')
      .sort((a, b) => b.lastSavedAt.localeCompare(a.lastSavedAt))[0] || null;

    setResumableAttempt(draftAttempt);
    setDeviceAttempts(
      attempts.sort((a, b) => b.lastSavedAt.localeCompare(a.lastSavedAt))
    );
  }, []);

  const getExamTitle = useCallback((attempt: OfflineAttemptRecord) => {
    const matchingExam = exams.find((exam) => exam.id === attempt.examId);
    return matchingExam?.storyTitle || `Examen de ${attempt.grade} grado`;
  }, [exams]);

  const getAttemptStatusMeta = (status: OfflineAttemptRecord['status']) => {
    switch (status) {
      case 'draft':
        return {
          label: 'En progreso',
          badgeClassName: 'bg-sky-100 text-sky-800',
        };
      case 'pending':
      case 'completed_local':
        return {
          label: 'Pendiente de sincronizar',
          badgeClassName: 'bg-amber-100 text-amber-800',
        };
      case 'running':
        return {
          label: 'Sincronizando',
          badgeClassName: 'bg-violet-100 text-violet-800',
        };
      case 'failed':
        return {
          label: 'Error de sincronizacion',
          badgeClassName: 'bg-rose-100 text-rose-700',
        };
      case 'synced':
        return {
          label: 'Sincronizado',
          badgeClassName: 'bg-emerald-100 text-emerald-700',
        };
      default:
        return {
          label: status,
          badgeClassName: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) {
      return null;
    }

    return new Date(value).toLocaleString();
  };

  const fetchOnlineData = useCallback(async () => {
    const response = await fetch('/api/offline/cache-manifest', { cache: 'no-store' });
    const payload = await response.json() as OfflineCacheManifest | { error: string };

    if (!response.ok) {
      throw new Error('error' in payload ? payload.error : 'No se pudo cargar el manifest offline');
    }

    const manifest = payload as OfflineCacheManifest;

    setSchools(manifest.schools);
    setExams(manifest.exams);
    return manifest;
  }, []);

  const warmPreparedRoutes = useCallback(async (examIds: string[]) => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      await navigator.serviceWorker.ready.catch(() => undefined);
    }

    await router.prefetch('/completo');
    await Promise.all(
      examIds.map(async (examId) => {
        await router.prefetch(`/examen/${examId}?attemptId=offline-warmup`);
        await fetch(`/examen/${examId}?attemptId=offline-warmup`, { cache: 'no-store' }).catch(() => undefined);
      })
    );
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialState() {
      setIsLoading(true);
      setIsOnline(isBrowserOnline());

      try {
        await refreshLocalState();

        if (isBrowserOnline()) {
          await fetchOnlineData();
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron actualizar los datos online. Se mostrara la informacion guardada en el dispositivo.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialState();

    const unsubscribe = subscribeToConnectivityChange(async (online) => {
      setIsOnline(online);

      if (online) {
        try {
          await fetchOnlineData();
          const jobs = await getAllQueueJobs();
          if (jobs.length > 0) {
            setStatusMessage('Conexion recuperada. Sincronizando examenes pendientes...');
            const results = await runAllPendingSyncJobs();
            await refreshLocalState();
            const failedCount = results.filter((result) => !result.success).length;
            setStatusMessage(
              failedCount === 0
                ? 'Sincronizacion completada.'
                : `Sincronizacion parcial: ${failedCount} intento(s) requieren revision.`
            );
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al sincronizar al recuperar conexion');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchOnlineData, refreshLocalState]);

  const offlineReady = useMemo(() => {
    return expectedOfflineExamCount > 0 && cachedExamCount === expectedOfflineExamCount && schools.length > 0;
  }, [cachedExamCount, expectedOfflineExamCount, schools.length]);

  const handlePrepareOffline = async () => {
    setIsPreparingOffline(true);
    setError('');
    setStatusMessage('');

    try {
      const manifest = await fetchOnlineData();
      await saveOfflineManifest(manifest);

      await Promise.all(
        manifest.exams.map(async (exam) => {
          const response = await fetch(`/api/exams/${exam.id}`, { cache: 'no-store' });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || `No se pudo descargar el examen de ${exam.grade} grado`);
          }

          await saveCachedExamPayload(exam.id, exam.updatedAt, payload);
        })
      );

      await warmPreparedRoutes(manifest.exams.map((exam) => exam.id));

      await refreshLocalState();
      setStatusMessage('El dispositivo quedo preparado para trabajar offline.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error preparando el modo offline');
    } finally {
      setIsPreparingOffline(false);
    }
  };

  const handleSyncPending = async () => {
    setIsSyncing(true);
    setError('');
    setStatusMessage('');

    try {
      if (!isBrowserOnline()) {
        throw new Error('Necesitas conexion para sincronizar los examenes pendientes.');
      }

      const jobs = await getAllQueueJobs();
      if (jobs.length === 0) {
        setStatusMessage('No hay examenes pendientes por sincronizar.');
        return;
      }

      const results = await runAllPendingSyncJobs();
      await refreshLocalState();
      const failedCount = results.filter((result) => !result.success).length;
      setStatusMessage(
        failedCount === 0
          ? 'Las respuestas pendientes se sincronizaron correctamente.'
          : `Se sincronizaron algunos intentos, pero ${failedCount} quedaron con error.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar examenes pendientes');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAttemptRetry = async (attempt: OfflineAttemptRecord) => {
    setError('');
    setStatusMessage('');

    try {
      if (!isBrowserOnline()) {
        throw new Error('Necesitas conexion para reintentar la sincronizacion.');
      }

      const jobs = await getAllQueueJobs();
      let job = jobs.find((item) => item.offlineAttemptId === attempt.offlineAttemptId);

      if (!job) {
        job = await enqueueExamSync(attempt.offlineAttemptId);
      }

      await runExamSyncJob(job);
      await refreshLocalState();
      setStatusMessage(`El intento de ${attempt.studentName} se sincronizo correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reintentar la sincronizacion');
      await refreshLocalState();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !schoolId || !grade) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setStatusMessage('');

    try {
      const gradeNum = parseInt(grade, 10);
      const examForGrade = exams.find((exam) => exam.grade === gradeNum);

      if (!examForGrade) {
        setError('No hay examen disponible para este grado');
        return;
      }

      if (!isOnline) {
        const cachedExams = await getAllCachedExams();
        const cachedRecord = cachedExams.find((record) => record.examId === examForGrade.id && hasFullExamPayload(record.payload));

        if (!cachedRecord) {
          throw new Error('Este examen no esta descargado en el dispositivo. Conectate y usa "Preparar dispositivo offline" primero.');
        }
      }

      const offlineAttemptId = createOfflineAttemptId();
      await createOfflineAttempt({
        offlineAttemptId,
        studentName: name,
        schoolId,
        grade: gradeNum,
        examId: examForGrade.id,
        sessionType: 'EXAM',
        deviceId: getOrCreateDeviceId(),
        startedAt: new Date().toISOString(),
        examSnapshotVersion: examForGrade.updatedAt,
      });

      await refreshLocalState();
      router.push(`/examen/${examForGrade.id}?attemptId=${offlineAttemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el examen');
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf8ff_0%,#fffaf0_55%,#ffffff_100%)] p-4 md:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
        <Card className="border-sky-100 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardHeader className="text-center">
            <Image
              src="/LOGO-JUPA.png"
              alt="Logo JUPA"
              width={260}
              height={120}
              className="mx-auto mb-3 h-auto w-52"
              priority
            />
            <CardTitle className="text-2xl font-bold text-blue-900">
              JUPA Digital Offline
            </CardTitle>
            <CardDescription>
              Prepara el dispositivo, inicia examenes sin conexion y sincroniza despues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {isOnline ? 'Con conexion' : 'Sin conexion'}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${offlineReady ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-700'}`}>
                  {offlineReady ? 'Listo para offline' : 'Offline no preparado'}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {pendingSyncCount} pendiente(s) por sincronizar
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Examenes completos descargados: <span className="font-semibold text-slate-900">{cachedExamCount}</span>
                {expectedOfflineExamCount > 0 && (
                  <span> de <span className="font-semibold text-slate-900">{expectedOfflineExamCount}</span></span>
                )}
              </p>
              {!offlineReady && expectedOfflineExamCount > 0 && cachedExamCount > 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  La preparacion esta incompleta. Vuelve a preparar el dispositivo antes de salir sin conexion.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handlePrepareOffline}
                disabled={!isOnline || isPreparingOffline}
                className="flex-1 h-11 bg-sky-700 hover:bg-sky-800"
              >
                {isPreparingOffline ? 'Descargando...' : 'Preparar dispositivo offline'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncPending}
                disabled={!isOnline || isSyncing}
                className="flex-1 h-11"
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar pendientes'}
              </Button>
            </div>

            {resumableAttempt && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Tienes un examen en progreso guardado en este dispositivo.</p>
                <p className="mt-1 text-sm text-amber-800">{resumableAttempt.studentName} - Grado {resumableAttempt.grade}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => router.push(`/examen/${resumableAttempt.examId}?attemptId=${resumableAttempt.offlineAttemptId}`)}
                >
                  Reanudar examen guardado
                </Button>
              </div>
            )}

            {statusMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Cola del dispositivo</CardTitle>
            <CardDescription>
              Aqui puedes ver examenes en progreso, pendientes, fallidos o ya sincronizados en este dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deviceAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Aun no hay examenes locales guardados en este dispositivo.
              </div>
            ) : (
              deviceAttempts.map((attempt) => {
                const statusMeta = getAttemptStatusMeta(attempt.status);

                return (
                  <div key={attempt.offlineAttemptId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{attempt.studentName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClassName}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{getExamTitle(attempt)} - Grado {attempt.grade}</p>
                        <p className="mt-1 text-xs text-slate-500">Ultimo guardado: {new Date(attempt.lastSavedAt).toLocaleString()}</p>
                        {attempt.lastSyncAttemptAt && (
                          <p className="mt-1 text-xs text-slate-500">Ultimo intento de sync: {formatDateTime(attempt.lastSyncAttemptAt)}</p>
                        )}
                        {attempt.syncedAt && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">Sincronizado: {formatDateTime(attempt.syncedAt)}</p>
                        )}
                        {attempt.syncError && (
                          <p className="mt-2 text-xs font-medium text-rose-600">{attempt.syncError}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {attempt.status === 'draft' && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/examen/${attempt.examId}?attemptId=${attempt.offlineAttemptId}`)}
                          >
                            Reanudar
                          </Button>
                        )}

                        {(attempt.status === 'pending' || attempt.status === 'completed_local' || attempt.status === 'failed') && (
                          <Button
                            type="button"
                            variant={attempt.status === 'failed' ? 'destructive' : 'outline'}
                            disabled={!isOnline}
                            onClick={() => void handleAttemptRetry(attempt)}
                          >
                            {attempt.status === 'failed' ? 'Reintentar sync' : 'Sincronizar'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        </div>

        <Card className="border-blue-100 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900">Comenzar examen</CardTitle>
            <CardDescription>Si no hay internet, el examen solo podra iniciar si este dispositivo ya fue preparado.</CardDescription>
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

              <Button
                type="submit"
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Preparando examen...' : 'Comenzar Examen'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
