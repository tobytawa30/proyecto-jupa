import { NextResponse } from 'next/server';
import { and, count, desc, eq, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { auth, hashPassword } from '@/lib/auth/config';
import { userCreateSchema } from '@/lib/validations';

async function requireAdmin() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }

  if ((session.user as any)?.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 }) };
  }

  return { session };
}

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').trim();
  const role = searchParams.get('role');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('pageSize') || '10', 10);

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(pageSizeParam, 100)
    : 10;
  const offset = (page - 1) * pageSize;

  const filters: any[] = [];
  if (search) {
    filters.push(ilike(users.name, `%${search}%`));
  }
  if (role === 'ADMIN' || role === 'EDITOR') {
    filters.push(eq(users.role, role));
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  try {
    const [totalCount] = await db
      .select({ value: count() })
      .from(users)
      .where(whereClause);

    const total = Number(totalCount?.value || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [admins] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'ADMIN'));

    return NextResponse.json({
      users: allUsers,
      adminCount: Number(admins?.value || 0),
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
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  try {
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        passwordHash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario. Verifica que el email sea único.' }, { status: 500 });
  }
}
