import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { UsersPageClient } from '@/components/admin/users-page-client';

export default async function UsersPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if ((session.user as any)?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <UsersPageClient />;
}
