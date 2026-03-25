import { NextResponse } from 'next/server';
import { resolveAllAutomaticallyResolvableConflicts } from '@/lib/exams/offline-conflicts';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const grade = typeof body.grade === 'number' ? body.grade : undefined;
    const result = await resolveAllAutomaticallyResolvableConflicts({ grade });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error resolving conflicts in batch:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al resolver conflictos en lote' },
      { status: 500 }
    );
  }
}
