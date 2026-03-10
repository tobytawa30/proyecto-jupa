import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Examen Completado',
  description: 'Confirmacion de finalizacion del examen en JUPA Digital.',
  robots: {
    index: false,
    follow: false,
  },
};

function getStatusCopy(status?: string) {
  switch (status) {
    case 'synced':
      return {
        emoji: '☁️',
        title: 'Examen guardado y sincronizado',
        body: 'El examen se guardo en este dispositivo y ya fue enviado a la nube correctamente.',
        hint: 'Ya puedes volver al inicio para comenzar otro examen si hace falta.',
        tone: 'text-emerald-700',
        box: 'border-emerald-200 bg-emerald-50',
      };
    case 'pending-sync':
    default:
      return {
        emoji: '📚',
        title: 'Examen guardado en este dispositivo',
        body: 'El examen se completo correctamente aunque la sincronizacion quedo pendiente.',
        hint: 'Cuando vuelva la conexion, usa el boton de sincronizar pendientes desde el inicio.',
        tone: 'text-amber-800',
        box: 'border-amber-200 bg-amber-50',
      };
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; attemptId?: string }>;
}) {
  const { status } = await searchParams;
  const copy = getStatusCopy(status);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="pt-12 pb-8">
          <div className="mb-6 text-6xl">{copy.emoji}</div>
          <h1 className={`mb-4 text-3xl font-bold ${copy.tone}`}>
            {copy.title}
          </h1>
          <div className={`mb-6 rounded-2xl border p-4 text-left ${copy.box}`}>
            <p className="text-base text-slate-800">{copy.body}</p>
            <p className="mt-2 text-sm text-slate-600">{copy.hint}</p>
          </div>
          <p className="mb-8 text-sm text-gray-500">
            Tu maestro/a revisara tus respuestas y te dira tu calificacion pronto.
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
