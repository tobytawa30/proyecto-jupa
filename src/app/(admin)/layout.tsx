import { auth, signOut } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  LogOut,
  GraduationCap
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/examenes', label: 'Exámenes', icon: FileText },
    { href: '/escuelas', label: 'Escuelas', icon: GraduationCap },
    { href: '/resultados', label: 'Resultados', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold">JUPA Digital</h1>
          <p className="text-sm text-slate-400">Panel de Administración</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{session.user?.email}</span>
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 p-8">
        {children}
      </main>
    </div>
  );
}
