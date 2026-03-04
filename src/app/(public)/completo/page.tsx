import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Examen Completado',
  description: 'Confirmación de finalización del examen en JUPA Digital.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="pt-12 pb-8">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-green-700 mb-4">
            ¡Excelente Trabajo!
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Has completado el examen de lectura. 
            <br />
            ¡Muy bien hecho!
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Tu maestro/a revisará tus respuestas y te dirá tu calificación pronto.
          </p>
          <Link href="/">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Volver al inicio
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
