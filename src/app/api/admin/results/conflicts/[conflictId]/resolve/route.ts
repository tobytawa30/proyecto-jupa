import { NextResponse } from 'next/server';
import { resolveOfflineExamConflict } from '@/lib/exams/offline-conflicts';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conflictId: string }> }
) {
  try {
    const { conflictId } = await params;
    const result = await resolveOfflineExamConflict(conflictId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error resolving result conflict:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al resolver el conflicto de resultado',
      },
      { status: 500 }
    );
  }
}
