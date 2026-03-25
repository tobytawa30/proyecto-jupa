export function getOfflineConflictTitle(reason: string | null | undefined) {
  switch (reason) {
    case 'EXAM_VERSION_MISMATCH':
      return 'El examen fue actualizado';
    case 'MISSING_QUESTION_REFERENCE':
      return 'Faltan preguntas de la version original';
    case 'MISSING_OPTION_REFERENCE':
      return 'Faltan opciones de respuesta';
    default:
      return 'Revision pendiente';
  }
}

export function getOfflineConflictDescription(reason: string | null | undefined) {
  switch (reason) {
    case 'EXAM_VERSION_MISMATCH':
      return 'Este examen se respondio con una version anterior y necesita revision antes de consolidarlo como resultado final.';
    case 'MISSING_QUESTION_REFERENCE':
      return 'Algunas preguntas ya no existen en la version actual del examen, por eso el resultado no pudo cerrarse automaticamente.';
    case 'MISSING_OPTION_REFERENCE':
      return 'Algunas opciones respondidas ya no existen en la version actual del examen, por eso el resultado requiere revision.';
    default:
      return 'Este intento requiere revision manual antes de considerarse final.';
  }
}

export function getOfflineConflictStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'resolved':
      return 'Resuelto';
    case 'resolved_manual':
      return 'Revisado manualmente';
    case 'pending_review':
      return 'Revision pendiente';
    default:
      return 'Sin estado';
  }
}
