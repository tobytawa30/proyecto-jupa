import { db } from '@/lib/db';
import { exams, questions, questionOptions } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Eye } from 'lucide-react';

export default async function ExamsPage() {
  const allExams = await db
    .select({
      id: exams.id,
      title: exams.title,
      grade: exams.grade,
      storyTitle: exams.storyTitle,
      isActive: exams.isActive,
      totalPoints: exams.totalPoints,
      createdAt: exams.createdAt,
    })
    .from(exams)
    .orderBy(exams.grade);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exámenes</h1>
          <p className="text-gray-600">Gestiona los exámenes de lectura</p>
        </div>
        <Link href="/examenes/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Examen
          </Button>
        </Link>
      </div>

      {allExams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No hay exámenes creados</p>
            <Link href="/examenes/nuevo">
              <Button variant="outline">Crear primer examen</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allExams.map((exam) => (
            <Card key={exam.id} className={exam.isActive ? 'border-green-500 border-2' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exam.storyTitle}</CardTitle>
                    <p className="text-sm text-gray-500">{exam.title}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    exam.isActive 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {exam.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Grado:</span>
                    <span className="font-medium">{exam.grade}º</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Puntaje total:</span>
                    <span className="font-medium">{exam.totalPoints} pts</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/examenes/${exam.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
