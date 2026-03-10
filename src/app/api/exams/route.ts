import { NextResponse } from 'next/server';
import { getActiveExamManifestItems } from '@/lib/exams/public';

export async function GET() {
  try {
    const activeExams = await getActiveExamManifestItems();

    return NextResponse.json(activeExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Error al obtener exámenes' }, { status: 500 });
  }
}
