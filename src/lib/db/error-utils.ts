function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || '');
}

export function isOfflineSchemaMismatch(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('offline_attempt_id')
    || message.includes('session_source')
    || message.includes('exam_snapshot_version')
    || message.includes('synced_at')
    || message.includes('device_id')
    || message.includes('exam_answers_session_question_idx')
  );
}

export function getOfflineSchemaMismatchMessage() {
  return 'La base de datos de produccion no tiene aplicada la migracion del modo offline. Ejecuta la migracion `drizzle/0000_offline_exam_support.sql` en cloud y vuelve a intentar la sincronizacion.';
}
