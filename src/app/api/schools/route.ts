import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { schools } from '@/lib/db/schema';

export async function GET() {
  try {
    const allSchools = await db
      .select({
        id: schools.id,
        name: schools.name,
        code: schools.code,
      })
      .from(schools)
      .orderBy(schools.name);

    return NextResponse.json(allSchools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json({ error: 'Error al obtener escuelas' }, { status: 500 });
  }
}
