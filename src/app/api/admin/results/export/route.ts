import { NextResponse } from 'next/server';
import { formatDateDDMMYYYY } from '@/lib/utils';
import { escapeCsvValue, listResults, parseResultsFilters } from '@/lib/results/query';
import { getOfflineConflictStatusLabel } from '@/lib/exams/offline-conflict-copy';

function getExportStatusLabel(result: { reviewStatus: string | null }) {
  if (result.reviewStatus === 'pending_review' || result.reviewStatus === 'resolved_manual') {
    return getOfflineConflictStatusLabel(result.reviewStatus);
  }

  return 'Finalizado';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseResultsFilters(searchParams);
    const results = await listResults(filters);

    return NextResponse.json({
      fileName: `resultados-examenes-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: results.map((result) => ({
        Nombre: result.name,
        Escuela: result.schoolName || '',
        Grado: result.grade,
        Examen: result.examTitle || '',
        Estado: getExportStatusLabel(result),
        Puntaje: result.totalScore || (result.reviewStatus === 'pending_review' ? 'Pendiente' : ''),
        Nivel: result.performanceLevel || (result.reviewStatus === 'pending_review' ? 'En revision' : ''),
        Fecha: formatDateDDMMYYYY(result.displayDate),
      })),
      csv: [
        ['Nombre', 'Escuela', 'Grado', 'Examen', 'Estado', 'Puntaje', 'Nivel', 'Fecha'].map(escapeCsvValue).join(','),
        ...results.map((result) => [
          result.name,
          result.schoolName || '',
          result.grade,
          result.examTitle || '',
          getExportStatusLabel(result),
          result.totalScore || (result.reviewStatus === 'pending_review' ? 'Pendiente' : ''),
          result.performanceLevel || (result.reviewStatus === 'pending_review' ? 'En revision' : ''),
          formatDateDDMMYYYY(result.displayDate),
        ].map(escapeCsvValue).join(',')),
      ].join('\n'),
      total: results.length,
    });
  } catch (error) {
    console.error('Error exporting results:', error);
    return NextResponse.json({ error: 'Error al exportar resultados' }, { status: 500 });
  }
}
