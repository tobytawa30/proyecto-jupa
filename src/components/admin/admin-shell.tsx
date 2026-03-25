'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: ReactNode;
  userEmail?: string | null;
  userRole?: 'ADMIN' | 'EDITOR' | null;
}

const primaryNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
  { href: '/resultados/conflictos', label: 'Conflictos', icon: AlertTriangle },
];

const configNavItems = [
  { href: '/usuarios', label: 'Usuarios', icon: Users },
  { href: '/escuelas', label: 'Escuelas', icon: GraduationCap },
  { href: '/examenes', label: 'Examenes', icon: FileText },
];

function isRouteActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  if (href === '/resultados') {
    return pathname === '/resultados' || (pathname.startsWith('/resultados/') && !pathname.startsWith('/resultados/conflictos'));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, userEmail, userRole }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const availableConfigItems = configNavItems.filter((item) => {
    if (item.href === '/usuarios' && userRole !== 'ADMIN') {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <header className="md:hidden h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Image src="/LOGO-JUPA.png" alt="Logo JUPA" width={120} height={45} className="h-auto w-28" priority />
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
        <aside
          className={cn(
            'hidden md:flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-100 transition-all duration-200',
            collapsed ? 'w-20' : 'w-72',
          )}
        >
          <div className="h-16 px-3 flex items-center justify-between border-b border-slate-800">
            <div className={cn('flex items-center gap-2 overflow-hidden', collapsed && 'justify-center w-full')}>
              <Image src="/LOGO-JUPA.png" alt="Logo JUPA" width={120} height={45} className="h-auto w-24" priority />
              {!collapsed && <span className="text-sm font-semibold tracking-wide">JUPA Digital</span>}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Colapsar sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Expandir sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-4 overflow-hidden">
            <div className="space-y-1">
              {primaryNavItems.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Configuracion
                </p>
              )}

              {availableConfigItems.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800 p-3 space-y-2">
            {!collapsed && <p className="truncate text-xs text-slate-400">{userEmail || 'admin@jupa.org'}</p>}
            <Button
              type="button"
              onClick={handleLogout}
              variant="ghost"
              className={cn(
                'w-full text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center px-2',
              )}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Cerrar sesion</span>}
            </Button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menu"
          />

          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-950 text-slate-100 border-r border-slate-800 p-3">
            <div className="h-12 flex items-center justify-between border-b border-slate-800 mb-3">
              <Image src="/LOGO-JUPA.png" alt="Logo JUPA" width={120} height={45} className="h-auto w-24" priority />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Cerrar sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-4">
              <div className="space-y-1">
                {primaryNavItems.map((item) => {
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-1">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Configuracion
                </p>

                {availableConfigItems.map((item) => {
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="absolute bottom-3 left-3 right-3 border-t border-slate-800 pt-3 space-y-2">
              <p className="truncate text-xs text-slate-400">{userEmail || 'admin@jupa.org'}</p>
              <Button
                type="button"
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Cerrar sesion</span>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
