import type { Metadata } from 'next';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: 'Panel de Administración',
  description: 'Panel interno de administración de JUPA Digital.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <AdminShell
      userEmail={session.user?.email}
      userRole={((session.user as any)?.role as 'ADMIN' | 'EDITOR' | undefined) || null}
    >
      {children}
    </AdminShell>
  );
}
