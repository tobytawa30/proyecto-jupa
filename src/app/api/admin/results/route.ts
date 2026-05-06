import { NextResponse } from 'next/server';
import { countResults, listResultExams, listResults, parseResultsFilters } from '@/lib/results/query';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseResultsFilters(searchParams);

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('pageSize') || '10', 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(pageSizeParam, 100)
    : 10;
  const offset = (page - 1) * pageSize;

  try {
    const total = await countResults(filters);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const [results, examsList] = await Promise.all([
      listResults(filters, { limit: pageSize, offset }),
      listResultExams(),
    ]);

    return NextResponse.json({
      results,
      exams: examsList,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
  }
}
