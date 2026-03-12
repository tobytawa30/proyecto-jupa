function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || '');
}

const OFFLINE_SCHEMA_IDENTIFIERS = [
  'offline_attempt_id',
  'session_source',
  'exam_snapshot_version',
  'synced_at',
  'device_id',
  'exam_answers_session_question_idx',
];

const SCHEMA_MISMATCH_PATTERNS = [
  'column',
  'type',
  'relation',
  'index',
  'does not exist',
  'doesn\'t exist',
  'unknown',
  'undefined',
  'no such',
];

export function isOfflineSchemaMismatch(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  const mentionsOfflineSchemaObject = OFFLINE_SCHEMA_IDENTIFIERS.some((identifier) => message.includes(identifier));
  const looksLikeMissingSchemaError = SCHEMA_MISMATCH_PATTERNS.some((pattern) => message.includes(pattern));

  return mentionsOfflineSchemaObject && looksLikeMissingSchemaError;
}

export function getOfflineSchemaMismatchMessage() {
  return 'La base de datos de produccion no tiene aplicada la migracion del modo offline. Ejecuta la migracion `drizzle/0000_offline_exam_support.sql` en cloud y vuelve a intentar la sincronizacion.';
}

export function getErrorDebugMessage(error: unknown) {
  return getErrorMessage(error);
}
