import { NextResponse } from 'next/server';
import { getPublicExamById } from '@/lib/exams/public';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await getPublicExamById(id);

    if (!exam) {
      return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: 'Error al obtener examen' }, { status: 500 });
  }
}
