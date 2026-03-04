import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Examen en Curso',
  description: 'Vista de examen para estudiantes en JUPA Digital.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
