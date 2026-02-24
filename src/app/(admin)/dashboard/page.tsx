import { db } from '@/lib/db';
import { studentSessions, exams, schools } from '@/lib/db/schema';
import { eq, count, avg, sql } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, TrendingUp, GraduationCap } from 'lucide-react';

export default async function DashboardPage() {
  const totalStudents = await db
    .select({ count: count() })
    .from(studentSessions)
    .where(eq(studentSessions.completedAt, sql`NOT NULL`));

  const totalExams = await db
    .select({ count: count() })
    .from(exams);

  const activeExams = await db
    .select({ count: count() })
    .from(exams)
    .where(eq(exams.isActive, true));

  const totalSchools = await db
    .select({ count: count() })
    .from(schools);

  const avgScore = await db
    .select({ 
      avg: avg(sql`CAST(${studentSessions.totalScore} AS FLOAT)`) 
    })
    .from(studentSessions)
    .where(eq(studentSessions.completedAt, sql`NOT NULL`));

  const recentSessions = await db
    .select({
      id: studentSessions.id,
      name: studentSessions.name,
      grade: studentSessions.grade,
      totalScore: studentSessions.totalScore,
      performanceLevel: studentSessions.performanceLevel,
      completedAt: studentSessions.completedAt,
    })
    .from(studentSessions)
    .where(eq(studentSessions.completedAt, sql`NOT NULL`))
    .orderBy(sql`${studentSessions.completedAt} DESC`)
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen de la plataforma JUPA Digital</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Completados
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents[0]?.count || 0}</div>
            <p className="text-xs text-gray-500">exámenes completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Exámenes Activos
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExams[0]?.count || 0}</div>
            <p className="text-xs text-gray-500">de {totalExams[0]?.count || 0} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Promedio de Notas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgScore[0]?.avg ? `${Number(avgScore[0].avg).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-gray-500">puntaje promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Escuelas
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchools[0]?.count || 0}</div>
            <p className="text-xs text-gray-500">escuelas registradas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exámenes Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay exámenes completados aún
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Estudiante</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Grado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Puntaje</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Nivel</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{session.name}</td>
                      <td className="py-3 px-4">{session.grade}º</td>
                      <td className="py-3 px-4">{session.totalScore || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.performanceLevel === 'ALTO' 
                            ? 'bg-green-100 text-green-700'
                            : session.performanceLevel === 'MEDIO'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {session.performanceLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {session.completedAt 
                          ? new Date(session.completedAt).toLocaleDateString('es-ES')
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
