import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso Administrador',
  description: 'Acceso al panel de administración de JUPA Digital.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
