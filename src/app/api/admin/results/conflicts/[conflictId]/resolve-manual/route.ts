import { NextResponse } from 'next/server';
import { resolveOfflineExamConflictManually } from '@/lib/exams/offline-conflicts';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conflictId: string }> }
) {
  try {
    const { conflictId } = await params;
    const result = await resolveOfflineExamConflictManually(conflictId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error resolving result conflict manually:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al marcar el conflicto como revisado manualmente',
      },
      { status: 500 }
    );
  }
}
