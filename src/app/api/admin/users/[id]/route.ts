import { NextResponse } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { auth, hashPassword } from '@/lib/auth/config';
import { userUpdateSchema } from '@/lib/validations';

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

async function getAdminCount() {
  const [admins] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, 'ADMIN'));

  return Number(admins?.value || 0);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = userUpdateSchema.safeParse({
      ...body,
      password: body.password || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const currentUserId = (access.session?.user as any)?.id as string | undefined;
    if (currentUserId === id && parsed.data.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No puedes quitarte permisos de administrador' }, { status: 400 });
    }

    if (existingUser.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
      const adminCount = await getAdminCount();
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Debe existir al menos un administrador' }, { status: 400 });
      }
    }

    const updateData: {
      name: string;
      email: string;
      role: 'ADMIN' | 'EDITOR';
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
    };

    if (parsed.data.password) {
      updateData.passwordHash = await hashPassword(parsed.data.password);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  try {
    const { id } = await params;
    const currentUserId = (access.session?.user as any)?.id as string | undefined;

    if (currentUserId === id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (existingUser.role === 'ADMIN') {
      const adminCount = await getAdminCount();
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Debe existir al menos un administrador' }, { status: 400 });
      }
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
