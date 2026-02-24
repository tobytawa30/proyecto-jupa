import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { schools } from '@/lib/db/schema';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code } = body;

    await db.update(schools).set({ name, code }).where(eq(schools.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating school:', error);
    return NextResponse.json({ error: 'Error al actualizar escuela' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const { id } = await params;
    await db.delete(schools).where(eq(schools.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting school:', error);
    return NextResponse.json({ error: 'Error al eliminar escuela' }, { status: 500 });
  }
}
