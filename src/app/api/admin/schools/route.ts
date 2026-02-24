import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { schools } from '@/lib/db/schema';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const body = await request.json();
    const { name, code } = body;

    const [newSchool] = await db.insert(schools).values({
      name,
      code,
    }).returning();

    return NextResponse.json(newSchool);
  } catch (error) {
    console.error('Error creating school:', error);
    return NextResponse.json({ error: 'Error al crear escuela' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const allSchools = await db.select().from(schools);
  return NextResponse.json(allSchools);
}
