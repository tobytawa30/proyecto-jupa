# Especificaciones Técnicas (SPEC) - JUPA Digital

**Versión:** 1.0  
**Fecha:** 19 de Febrero de 2026  
**Autor:** Manus AI (para Toby Tawachi)  
**Estado:** Borrador Inicial

---

## 1. Arquitectura General
El sistema se construirá como una aplicación web moderna utilizando el stack **T3** (Next.js, TypeScript, Tailwind CSS) o similar, desplegada en la infraestructura serverless de **Vercel**. La base de datos será **PostgreSQL** gestionada por **Neon** (Vercel Postgres), y la autenticación se manejará con **NextAuth.js**.

### 1.1 Diagrama de Componentes (Conceptual)
*   **Frontend (Cliente):** Next.js (App Router), React 19, Tailwind CSS, Shadcn UI.
*   **Backend (API):** Next.js Server Actions / API Routes.
*   **Base de Datos:** Vercel Postgres (NeonDB).
*   **Autenticación:** NextAuth.js (Providers: Credentials para admin, Anonymous/Token para estudiantes).
*   **ORM:** Drizzle ORM o Prisma (recomendado: Drizzle por ligereza en serverless).

## 2. Stack Tecnológico Detallado

| Componente | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Estándar de industria, SSR/SSG híbrido, optimización de imágenes. |
| **Lenguaje** | TypeScript | Tipado estático para reducir errores en tiempo de ejecución. |
| **Estilos** | Tailwind CSS + Shadcn UI | Desarrollo rápido de UI consistente y accesible. |
| **Base de Datos** | Vercel Postgres (Neon) | Serverless nativo, escalado automático, integración directa con Vercel. |
| **ORM** | Drizzle ORM | Type-safe, ligero, ideal para serverless (cold starts rápidos). |
| **Auth** | NextAuth.js (v5) | Manejo de sesiones seguro, fácil integración con proveedores. |
| **Validación** | Zod | Validación de esquemas en cliente y servidor. |
| **Formularios** | React Hook Form | Manejo eficiente de estados de formularios complejos. |
| **Deploy** | Vercel | CI/CD automático, Edge Network global. |

## 3. Esquema de Base de Datos (Propuesta Inicial)

### 3.1 Tablas Principales

#### `users` (Administradores)
*   `id`: UUID (PK)
*   `name`: Text
*   `email`: Text (Unique)
*   `password_hash`: Text
*   `role`: Enum ('ADMIN', 'EDITOR')
*   `created_at`: Timestamp

#### `exams` (Exámenes)
*   `id`: UUID (PK)
*   `title`: Text
*   `grade`: Integer (1-4)
*   `description`: Text
*   `is_active`: Boolean
*   `created_at`: Timestamp

#### `questions` (Preguntas)
*   `id`: UUID (PK)
*   `exam_id`: UUID (FK -> exams.id)
*   `text`: Text
*   `type`: Enum ('MULTIPLE_CHOICE', 'OPEN_TEXT')
*   `options`: JSONB (Array de opciones {id, text, is_correct})
*   `order`: Integer

#### `students` (Sesiones de Estudiante)
*   `id`: UUID (PK)
*   `name`: Text
*   `school`: Text
*   `grade`: Integer
*   `started_at`: Timestamp
*   `completed_at`: Timestamp (Nullable)

#### `answers` (Respuestas)
*   `id`: UUID (PK)
*   `student_id`: UUID (FK -> students.id)
*   `question_id`: UUID (FK -> questions.id)
*   `selected_option_id`: Text (Nullable)
*   `text_answer`: Text (Nullable)
*   `is_correct`: Boolean (Nullable, calculado para MC)
*   `score`: Integer (Nullable, asignado manualmente para Open Text)

## 4. Rutas de API y Server Actions

### 4.1 Públicas (Estudiantes)
*   `GET /api/exams`: Listar exámenes activos por grado.
*   `GET /api/exams/:id`: Obtener detalles de un examen (sin respuestas correctas).
*   `POST /api/submit`: Enviar respuestas de un examen completo.
    *   **Validación:** Zod schema para asegurar integridad de datos.
    *   **Lógica:** Calcular puntaje automático para MC, guardar respuestas abiertas para revisión.

### 4.2 Privadas (Admin - Protegidas por Middleware)
*   `GET /api/admin/dashboard`: Métricas generales (total estudiantes, promedio notas).
*   `GET /api/admin/results`: Listado paginado de resultados.
*   `POST /api/admin/exams`: Crear nuevo examen.
*   `PUT /api/admin/exams/:id`: Editar examen existente.
*   `PATCH /api/admin/answers/:id/grade`: Calificar respuesta abierta manualmente.

## 5. Seguridad y Consideraciones
*   **Protección CSRF:** Integrada en Next.js.
*   **Rate Limiting:** Configurar en Vercel (Edge Middleware) para evitar abuso de la API pública.
*   **Sanitización:** Zod se encarga de validar entradas, React escapa HTML por defecto para evitar XSS.
*   **Backup:** Neon ofrece backups automáticos (Point-in-time Recovery).

## 6. Flujo de Desarrollo (Git)
1.  **Main:** Rama de producción (despliegue automático a Vercel).
2.  **Develop:** Rama de integración.
3.  **Feature/**: Ramas por funcionalidad (ej. `feature/auth`, `feature/exam-engine`).
4.  **PRs:** Pull Requests obligatorios para merge a Develop/Main.

## 7. Configuración Inicial (Starter Kit)
Se recomienda iniciar con el template oficial:
```bash
npx create-next-app@latest jupa-digital --example https://github.com/vercel/nextjs-postgres-nextauth-starter
```
Este starter incluye:
*   Next.js App Router
*   Vercel Postgres (configurado)
*   NextAuth.js (configurado)
*   Tailwind CSS
*   TypeScript
